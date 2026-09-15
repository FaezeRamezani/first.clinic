import { sqlite } from '../config/database';
import { runMigrations } from './migrate';
import { runSeed } from './seed';

export function resetDatabase() {
  console.log('[Reset] Resetting database schema and clearing all tables...');
  
  // Disable foreign keys temporarily for clean table drops
  sqlite.pragma('foreign_keys = OFF');
  
  const tables = sqlite.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];

  for (const table of tables) {
    sqlite.prepare(`DROP TABLE IF EXISTS "${table.name}"`).run();
  }

  sqlite.pragma('foreign_keys = ON');
  console.log('[Reset] Database dropped. Re-applying migrations and seed...');
  
  runMigrations();
  runSeed();
  console.log('[Reset] Database reset and re-seeded successfully.');
}

if (process.argv[1]?.includes('reset.ts') || process.argv[1]?.includes('reset.js')) {
  try {
    resetDatabase();
  } catch (err) {
    console.error('[Reset Error] Failed to reset database:', err);
    process.exit(1);
  }
}
