import { sqlite } from '../config/database.js';

export function getTableCounts() {
  const tables = [
    'patients',
    'patient_practice_memberships',
    'doctors',
    'doctor_schedules',
    'clinic_settings',
    'services',
    'appointments',
    'financial_obligations',
    'payment_receipts',
    'follow_up_tasks',
    'expenses',
    'payment_accounts',
    'online_requests'
  ];

  console.log('=== Database Table Row Counts ===');
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const res = sqlite.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get() as { count: number };
    counts[table] = res.count;
    console.log(`${table}: ${res.count} rows`);
  }
  return counts;
}

if (process.argv[1]?.includes('checkCounts.ts') || process.argv[1]?.includes('checkCounts.js')) {
  getTableCounts();
}
