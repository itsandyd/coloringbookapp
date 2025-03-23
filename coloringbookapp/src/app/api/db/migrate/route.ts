import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// This route should be called once to set up the database tables
// It's not ideal for production, but works for this example
export async function GET(request: NextRequest) {
  try {
    // Only allow in development or with a secret key
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database URL is not configured' },
        { status: 500 }
      );
    }

    const sql = neon(process.env.DATABASE_URL);
    
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        uuid TEXT UNIQUE NOT NULL,
        prompt TEXT NOT NULL,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS drawings (
        id SERIAL PRIMARY KEY,
        image_id TEXT NOT NULL REFERENCES images(uuid),
        lines JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully'
    });
  } catch (error) {
    console.error('Error running migrations:', error);
    return NextResponse.json(
      { error: 'Failed to run migrations' },
      { status: 500 }
    );
  }
} 