import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

// Initialize the Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Define the expected mask structure from the SAM model
interface MaskData {
  bbox: number[];
  mask_path?: string;
  points?: number[][];
  segmentation?: boolean[][] | string;
  score?: number;
}

// Define interfaces for Replicate outputs
interface MaskItem {
  bbox?: number[];
  box?: number[];
  mask_path?: string;
  segmentation?: boolean[][] | string;
  mask?: boolean[][] | string;
  score?: number;
}

interface MasksOutput {
  masks?: MaskItem[];
  urls?: { get: string } | string;
  [key: string]: unknown;
}

// Process an image URL with SAM to get segmentation masks
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imageId } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token is not configured' },
        { status: 500 }
      );
    }
    
    console.log("Processing image with Segment Anything Model:", imageUrl);
    
    // Call Replicate's Segment Anything Model endpoint with pablodawson's automatic version
    const prediction = await replicate.predictions.create({
      version: "meta/sam-2:fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83",
      input: {
        image: imageUrl,
        use_m2m: true,
        points_per_side: 32,
        pred_iou_thresh: 0.88,
        stability_score_thresh: 0.95
      },
    });
    
    // Wait for the prediction to complete
    const output = await replicate.wait(prediction);
    console.log("Received segmentation output type:", typeof output);
    
    // Process the mask data
    let masks: MaskData[] = [];
    
    // Function to extract and process SVG paths from output
    const processMasks = () => {
      // For pablodawson's model, we need to extract regions from the output
      // The exact output format requires inspection of actual results
      if (typeof output === 'string') {
        // If the output is a string URL to a PNG with masks
        // We'll create a single pseudo-mask with the full image dimensions
        console.log("Output is a string URL to an image:", output);
        masks = [{
          bbox: [0, 0, 600, 600],
          mask_path: output,
          score: 1.0
        }];
      } else if (Array.isArray(output)) {
        // If the model returns an array of mask objects
        console.log("Output is an array with", output.length, "items");
        output.forEach((item, index) => {
          if (item && typeof item === 'object') {
            // Extract mask data based on the model's output structure
            const itemData = item as MaskItem;
            const bbox = itemData.bbox || itemData.box || [0, 0, 600, 600];
            masks.push({
              bbox,
              mask_path: itemData.mask_path || `mask-${index}`,
              segmentation: itemData.segmentation || itemData.mask,
              score: itemData.score || 1.0
            });
          }
        });
      } else if (output && typeof output === 'object') {
        // If the model returns a single object with mask data
        console.log("Output is an object");
        const outputData = output as unknown as MasksOutput;
        
        if (outputData.masks && Array.isArray(outputData.masks)) {
          console.log("Object contains masks array with", outputData.masks.length, "items");
          outputData.masks.forEach((mask, index) => {
            const bbox = mask.bbox || mask.box || [0, 0, 600, 600];
            masks.push({
              bbox,
              mask_path: mask.mask_path || `mask-${index}`,
              segmentation: mask.segmentation || mask.mask,
              score: mask.score || 1.0
            });
          });
        } else {
          // If it's a single mask or we can't identify the structure
          console.log("Object doesn't contain a masks array, using as single mask");
          masks = [{
            bbox: [0, 0, 600, 600],
            mask_path: outputData.urls && typeof outputData.urls === 'object' ? outputData.urls.get : 
                       typeof outputData.urls === 'string' ? outputData.urls : 'unknown',
            score: 1.0
          }];
        }
      }

      return masks;
    };
    
    // Process the masks
    masks = processMasks();
    console.log(`Processed ${masks.length} masks`);
    
    // Store the masks in the database
    if (imageId) {
      await db.update(schema.images)
        .set({ masks })
        .where(eq(schema.images.uuid, imageId));
      
      console.log("Updated image with masks in database");
    }
    
    return NextResponse.json({ 
      success: true, 
      masks 
    });
  } catch (error) {
    console.error('Error processing image with SAM:', error);
    return NextResponse.json(
      { error: 'Failed to process image: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 