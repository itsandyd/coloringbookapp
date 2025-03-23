import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a SQL tag that uses Neon's serverless driver
const sql = neon(process.env.DATABASE_URL!);

// Create a Drizzle client with the connection and schema
export const db = drizzle(sql, { schema });

// Export the schema for use in queries
export { schema }; 