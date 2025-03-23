import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/images - Get all images
export async function GET(request: NextRequest) {
  try {
    // Check if we're looking for a specific image by UUID
    const url = new URL(request.url);
    const uuid = url.searchParams.get('uuid');
    
    if (uuid) {
      // Get a specific image
      const image = await db.select().from(schema.images).where(eq(schema.images.uuid, uuid)).limit(1);
      
      if (image.length === 0) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(image[0]);
    }
    
    // Get all images, ordered by newest first
    const images = await db
      .select()
      .from(schema.images)
      .orderBy(schema.images.createdAt)
      .limit(100); // Limit to prevent huge responses
    
    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// POST /api/images - Create a new image
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.prompt || !data.imageUrl) {
      return NextResponse.json(
        { error: 'prompt and imageUrl are required' },
        { status: 400 }
      );
    }
    
    // Generate a UUID if one wasn't provided
    const uuid = data.uuid || uuidv4();
    
    console.log("Creating image in database:", { uuid, prompt: data.prompt });
    
    // Insert the image into the database
    const result = await db.insert(schema.images).values({
      uuid,
      prompt: data.prompt,
      imageUrl: data.imageUrl,
    }).returning();
    
    console.log("Created image, result:", result);
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating image:', error);
    return NextResponse.json(
      { error: 'Failed to create image' },
      { status: 500 }
    );
  }
} 