import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

// GET /api/drawings?imageId=xyz - Get drawing for a specific image
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const imageId = url.searchParams.get('imageId');
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      );
    }
    
    // Get the drawing for this image
    const drawing = await db
      .select()
      .from(schema.drawings)
      .where(eq(schema.drawings.imageId, imageId))
      .limit(1);
    
    if (drawing.length === 0) {
      return NextResponse.json(
        { error: 'Drawing not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(drawing[0]);
  } catch (error) {
    console.error('Error fetching drawing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drawing' },
      { status: 500 }
    );
  }
}

// POST /api/drawings - Create or update a drawing
export async function POST(request: NextRequest) {
  try {
    const { imageId, lines, fills } = await request.json();
    
    if (!imageId || !lines) {
      return NextResponse.json(
        { error: 'imageId and lines are required' },
        { status: 400 }
      );
    }
    
    // Check if the drawing already exists
    const existingDrawing = await db
      .select()
      .from(schema.drawings)
      .where(eq(schema.drawings.imageId, imageId))
      .limit(1);
    
    if (existingDrawing.length > 0) {
      // Update existing drawing
      await db.update(schema.drawings)
        .set({
          lines,
          fills: fills || existingDrawing[0].fills, // Preserve existing fills if not provided
          updatedAt: new Date(),
        })
        .where(eq(schema.drawings.imageId, imageId));
      
      return NextResponse.json({
        success: true,
        message: 'Drawing updated successfully',
      });
    }
    
    // Create new drawing
    await db.insert(schema.drawings).values({
      imageId,
      lines,
      fills: fills || [], // Initialize empty fills array if not provided
    });
    
    return NextResponse.json({
      success: true,
      message: 'Drawing saved successfully',
    });
  } catch (error) {
    console.error('Error saving drawing:', error);
    return NextResponse.json(
      { error: 'Failed to save drawing' },
      { status: 500 }
    );
  }
} 