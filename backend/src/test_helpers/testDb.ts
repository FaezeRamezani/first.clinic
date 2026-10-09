import path from 'path';
import fs from 'fs';

export interface TestDbEnvironment {
  tempDbPath: string;
  sqlite: any;
  db: any;
  cleanup: () => void;
}

/**
 * Strict safety guard to prevent tests from ever running against production or main clinic database.
 * If targetPath or any resolved path matches the main clinic database, this throws immediately.
 */
export function assertTestDbSafety(targetPath?: string): void {
  const currentPath = targetPath || process.env.DATABASE_PATH || 'data/clinic.db';
  const resolved = path.resolve(currentPath).toLowerCase();

  const forbiddenFiles = [
    path.resolve(process.cwd(), 'data/clinic.db').toLowerCase(),
    path.resolve(process.cwd(), '../data/clinic.db').toLowerCase(),
    path.resolve('D:/Test1/clinic-management/backend/data/clinic.db').toLowerCase(),
    path.resolve('D:/Test1/clinic-management/data/clinic.db').toLowerCase()
  ];

  for (const forbidden of forbiddenFiles) {
    if (resolved === forbidden) {
      throw new Error(
        `🚨 CRITICAL SAFETY GUARD VIOLATION: Test was about to connect to main clinic database: "${resolved}". Execution aborted!`
      );
    }
  }

  // General protection: Any file simply named "clinic.db" is forbidden in tests
  if (path.basename(resolved) === 'clinic.db') {
    throw new Error(
      `🚨 CRITICAL SAFETY GUARD VIOLATION: Database name cannot be "clinic.db" in tests. Execution aborted!`
    );
  }
}

/**
 * Creates a dedicated, isolated SQLite database file for testing.
 * Automatically runs Drizzle migrations and base data seed.
 * Guarantees zero pollution of the main clinic database.
 */
export async function createIsolatedTestDb(prefix: string = 'test'): Promise<TestDbEnvironment> {
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const tempDbName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.db`;
  const tempDbPath = path.resolve(dataDir, tempDbName);

  // Pre-check incoming DATABASE_PATH: if someone explicitly points to clinic.db, abort immediately
  if (process.env.DATABASE_PATH) {
    assertTestDbSafety(process.env.DATABASE_PATH);
  }

  // Set DATABASE_PATH BEFORE loading any modules that depend on database.ts
  process.env.DATABASE_PATH = tempDbPath;

  // Enforce safety guard check on the generated temp DB
  assertTestDbSafety(tempDbPath);

  console.log(`[TestDb Guard] Verified isolated test database path: ${tempDbPath}`);

  // Dynamic import of database config, migrations, and seed
  const { sqlite, db } = await import('../config/database');
  const { runMigrations } = await import('../db/migrate');
  const { runSeed } = await import('../db/seed');

  // Verify that SQLite is actually open on the temporary file
  const dbList = sqlite.prepare('PRAGMA database_list').all() as { file: string }[];
  const connectedFile = dbList.find(d => d.file)?.file;
  if (connectedFile) {
    assertTestDbSafety(connectedFile);
  }

  // Initialize schema via migrations
  runMigrations();

  // Post-migration column/table synchronization for runtime Drizzle models
  try {
    sqlite.exec('ALTER TABLE patient_practice_memberships ADD COLUMN phone TEXT;');
  } catch (_) {}

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
  } catch (_) {}

  try {
    sqlite.exec('ALTER TABLE payment_receipts ADD COLUMN deposit_id TEXT;');
  } catch (_) {}

  try {
    sqlite.exec("ALTER TABLE payment_receipts ADD COLUMN receipt_type TEXT DEFAULT 'normal';");
  } catch (_) {}

  // Run seed to populate doctors, base services, payment accounts, and clinic settings
  runSeed();

  const cleanup = () => {
    try {
      sqlite.close();
    } catch (_) {}

    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(tempDbPath + '-wal')) fs.unlinkSync(tempDbPath + '-wal');
      if (fs.existsSync(tempDbPath + '-shm')) fs.unlinkSync(tempDbPath + '-shm');
      console.log(`[TestDb Cleanup] Cleaned up temporary database: ${tempDbPath}`);
    } catch (err) {
      console.warn(`[TestDb Cleanup] Warning cleaning up temp file:`, err);
    }
  };

  return {
    tempDbPath,
    sqlite,
    db,
    cleanup
  };
}
