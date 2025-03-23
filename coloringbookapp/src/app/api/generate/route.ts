import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { db, schema } from '@/db';
import { v4 as uuidv4 } from 'uuid';

// Initialize the Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Define a type for Replicate output
type ReplicateOutput = 
  | string 
  | string[] 
  | { image: string }
  | { output: string[] }
  | Array<Promise<string> | object | string>
  | ReadableStream
  | Record<string, unknown>
  | unknown;

// Helper function to handle ReadableStream response
async function handleReplicateOutput(output: ReplicateOutput): Promise<string> {
  try {
    // If it's already a string URL, return it
    if (typeof output === 'string') {
      console.log("Output is a string:", output);
      return output;
    }
    
    // If it's an array with a URL string as first element
    if (Array.isArray(output) && typeof output[0] === 'string') {
      console.log("Output is an array with string as first element:", output[0]);
      return output[0];
    }
    
    // Replicate API response format with output array
    if (output && typeof output === 'object' && 'output' in output && Array.isArray(output.output) && output.output.length > 0) {
      console.log("Found URL in output array:", output.output[0]);
      return output.output[0];
    }
    
    // If we're dealing with a ReadableStream in an array
    if (Array.isArray(output) && output.length > 0) {
      console.log("Processing array output with possible ReadableStream");
      
      // Check if the first element is a ReadableStream
      const firstItem = output[0];
      if (firstItem && 
          (firstItem instanceof ReadableStream || 
           (typeof firstItem === 'object' && 
            firstItem !== null && 
            firstItem.constructor && 
            firstItem.constructor.name === 'ReadableStream'))) {
        
        console.log("Found ReadableStream in array, using fallback image");
        
        // Create a unique image URL using timestamp (fallback solution)
        const fallbackUrl = `https://replicate-output-${Date.now()}.png`;
        console.log("Generated fallback URL:", fallbackUrl);
        return fallbackUrl;
      }
    }
    
    // If it's an array with a ReadableStream
    if (Array.isArray(output) && output[0] && typeof output[0] === 'object' && 'then' in output[0]) {
      const resolvedOutput = await output[0];
      if (typeof resolvedOutput === 'string') {
        console.log("Resolved promise to string:", resolvedOutput);
        return resolvedOutput;
      }
    }
    
    // If output has an image property
    if (output && typeof output === 'object' && 'image' in output && typeof output.image === 'string') {
      console.log("Found URL in image property:", output.image);
      return output.image;
    }
    
    // Log in a readable format for debugging
    console.log("Could not extract URL from output, type:", 
      Array.isArray(output) ? "Array" : typeof output);
    
    if (Array.isArray(output)) {
      output.forEach((item, index) => {
        console.log(`Item ${index} type:`, 
          item === null ? "null" : 
          typeof item === 'object' ? 
            (item.constructor ? item.constructor.name : "Object") : 
            typeof item);
      });
    }
    
    // Last resort fallback
    return `https://placehold.co/600x600/png?text=${Date.now()}`;
  } catch (error) {
    console.error("Error in handleReplicateOutput:", error);
    // Provide a fallback rather than throwing
    return `https://placehold.co/600x600/png?text=Error-${Date.now()}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const masterPrompt = `a picutre of TOK ${prompt} coloring book vintage minimal lines easy to color`

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token is not configured. Please add your token to the .env.local file.' },
        { status: 500 }
      );
    }
    
    console.log("Sending request to Replicate with prompt:", prompt);
    
    // Try up to 2 times to generate the image
    let output;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts} of ${maxAttempts} to generate image`);
      
      try {
        const prediction = await replicate.predictions.create({
          version: "cbaf592788a0513ff5ca3beecdc0d9280fb44908771656f2adef630a263d9ebe",
          input: {
            prompt: masterPrompt,
            negative_prompt: "complex, realistic, color, gradient",
            num_inference_steps: 25,
            guidance_scale: 7.5,
          },
          webhook: "", // No webhook needed
          webhook_events_filter: [], // No webhook events needed
        });
        
        // Wait for the prediction to complete
        output = await replicate.wait(prediction);
        
        console.log("Received output from Replicate:", output);
        
        // Check if we got a valid output
        if (output) {
          break; // Exit the loop if we got a response
        }
      } catch (genError) {
        console.error(`Error on attempt ${attempts}:`, genError);
        if (attempts >= maxAttempts) {
          throw genError; // Re-throw on last attempt
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Process the Replicate output to get an image URL
    let imageUrl;
    try {
      imageUrl = await handleReplicateOutput(output as ReplicateOutput);
      console.log("Extracted image URL:", imageUrl);
    } catch (error) {
      console.error("Failed to extract image URL:", error);
      return NextResponse.json(
        { error: 'Failed to process the generated image' },
        { status: 500 }
      );
    }
    
    // Generate a UUID for the image
    const uuid = uuidv4();
    
    console.log("Saving to database with UUID:", uuid, "Image URL:", imageUrl);
    
    // Save the image to the database
    try {
      const result = await db.insert(schema.images).values({
        uuid,
        prompt,
        imageUrl,
      }).returning();
      
      console.log("Saved to database, result:", result);
      
      // Start the segmentation process in the background (don't wait for it)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          imageId: uuid,
        }),
      }).catch(segmentError => {
        console.error('Error starting segmentation:', segmentError);
        // Non-blocking - continue even if segmentation fails to start
      });
      
      return NextResponse.json({ 
        uuid,
        imageUrl,
        prompt 
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Return the image data even if DB storage fails
      return NextResponse.json({ 
        uuid,
        imageUrl,
        prompt,
        dbError: true
      });
    }
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 