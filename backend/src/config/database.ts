import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from '../db/schema/index';

const dbPath = process.env.DATABASE_PATH || 'data/clinic.db';
const fullDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

// Ensure database directory exists
const dbDir = path.dirname(fullDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create better-sqlite3 connection
export const sqlite = new Database(fullDbPath);

// Enable SQLite Foreign Keys and WAL Mode for local persistence and performance
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');

// Ensure optional phone column exists in patient_practice_memberships for practice-specific secondary mobile numbers
try {
  sqlite.exec('ALTER TABLE patient_practice_memberships ADD COLUMN phone TEXT;');
} catch (_) {
  // column already exists
}

// Drizzle ORM Instance
export const db = drizzle(sqlite, { schema });

export function checkDbConnection(): boolean {
  try {
    const result = sqlite.prepare('SELECT 1 as connected').get() as { connected: number };
    return result?.connected === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
