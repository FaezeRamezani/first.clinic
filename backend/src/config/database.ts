import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as schema from '../db/schema/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../..');

// Ensure backend/.env is loaded before resolving environment variables
dotenv.config({ path: path.join(backendDir, '.env') });

const configuredDbPath = process.env.DATABASE_PATH || 'clinic-live-backup.db';

function resolveDbPath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  if (inputPath.startsWith('backend/') || inputPath.startsWith('backend\\')) {
    return path.resolve(backendDir, inputPath.replace(/^backend[/\\]/, ''));
  }
  return path.resolve(backendDir, inputPath);
}

let fullDbPath = resolveDbPath(configuredDbPath);

// Graceful fallback to existing live backup locations if not found at exact target (and not running in test mode)
const isTestMode = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_DB_PATH) || (Boolean(process.env.DATABASE_PATH) && (process.env.DATABASE_PATH!.includes('test') || process.env.DATABASE_PATH!.includes('multi_checkout')));
if (!isTestMode && !fs.existsSync(fullDbPath)) {
  const directPath = path.resolve(backendDir, 'clinic-live-backup.db');
  const dataPath = path.resolve(backendDir, 'data', 'clinic-live-backup.db');
  if (fs.existsSync(directPath)) {
    fullDbPath = directPath;
  } else if (fs.existsSync(dataPath)) {
    fullDbPath = dataPath;
  }
}

// Ensure database directory exists
const dbDir = path.dirname(fullDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create better-sqlite3 connection
export const sqlite = new Database(fullDbPath);
console.log(`[Database] Active database initialized: ${fullDbPath}`);

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
