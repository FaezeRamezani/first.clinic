import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../config/database';
import path from 'path';

export function runMigrations() {
  console.log('[Migration] Applying database migrations...');
  const migrationsFolder = path.join(process.cwd(), 'src', 'db', 'migrations');
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
