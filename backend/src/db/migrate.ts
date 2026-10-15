import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../config/database';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  console.log('[Migration] Applying database migrations...');
  const directFolder = path.join(__dirname, 'migrations');
  const cwdFolder = path.join(process.cwd(), 'src', 'db', 'migrations');
  const migrationsFolder = fs.existsSync(directFolder) ? directFolder : cwdFolder;
  migrate(db, { migrationsFolder });
  console.log('[Migration] Database migrations completed successfully.');
}

if (process.argv[1]?.includes('migrate.ts') || process.argv[1]?.includes('migrate.js')) {
  try {
    runMigrations();
  } catch (error) {
    console.error('[Migration Error] Migration failed:', error);
    process.exit(1);
  }
}
