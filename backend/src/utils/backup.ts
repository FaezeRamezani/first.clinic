import fs from 'fs';
import path from 'path';
import { sqlite } from '../config/database';

export function performBackup(): string {
  const dbPath = process.env.DATABASE_PATH || 'data/clinic.db';
  const fullDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

  if (!fs.existsSync(fullDbPath)) {
    throw new Error(`Database file does not exist at ${fullDbPath}`);
  }

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `clinic-backup-${timestamp}.db`;
  const backupFilePath = path.join(backupDir, backupFileName);

  // Use SQLite online backup API via better-sqlite3 for a consistent snapshot
  sqlite.backup(backupFilePath);
  
  console.log(`[Backup Success] Created database backup at: ${backupFilePath}`);
  return backupFilePath;
}

// Run backup if called directly
if (process.argv[1]?.includes('backup.ts') || process.argv[1]?.includes('backup.js')) {
  try {
    performBackup();
  } catch (err) {
    console.error('[Backup Error] Failed to backup database:', err);
    process.exit(1);
  }
}
