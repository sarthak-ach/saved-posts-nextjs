import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  // We throw a runtime warning but don't crash compilation.
  // During local build/lint/test, DATABASE_URL might be missing.
  console.warn('Warning: DATABASE_URL is not set.');
}

const connectionString = process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost:5432/placeholder';
const sql = neon(connectionString);
export const db = drizzle({ client: sql, schema });
