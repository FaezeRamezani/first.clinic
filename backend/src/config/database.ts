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

// Ensure deposits table exists
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      practice TEXT NOT NULL,
      service_id TEXT REFERENCES services(id),
      appointment_id TEXT REFERENCES appointments(id),
      initial_amount INTEGER NOT NULL,
      remaining_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      payment_receipt_id TEXT,
      service_obligation_id TEXT,
      payment_method TEXT NOT NULL,
      payment_account_id TEXT REFERENCES payment_accounts(id),
      pos_account TEXT,
      payment_date TEXT NOT NULL,
      notes TEXT,
      history TEXT,
      created_at TEXT NOT NULL
    );
  `);
} catch (e) {
  console.error('Error ensuring deposits table:', e);
}

// Ensure deposit_id and receipt_type columns in payment_receipts
try {
  sqlite.exec('ALTER TABLE payment_receipts ADD COLUMN deposit_id TEXT;');
} catch (_) {}

try {
  sqlite.exec("ALTER TABLE payment_receipts ADD COLUMN receipt_type TEXT DEFAULT 'normal';");
} catch (_) {}

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
