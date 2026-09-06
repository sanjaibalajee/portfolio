// db/drizzle.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

function connect(databaseUrl: string) {
  return drizzle(neon(databaseUrl));
}

// Next.js evaluates route modules while collecting build metadata. A local
// placeholder keeps that import side-effect free. Runtime entry points check
// isDatabaseConfigured before issuing a query, so this URL is never contacted.
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);
const databaseUrl = process.env.DATABASE_URL || "postgresql://build:build@build.invalid/build?sslmode=require";
export const db = connect(databaseUrl);

export function requireDatabase() {
  if (!isDatabaseConfigured) {
    throw new Error("DATABASE_URL is not configured");
  }
}
