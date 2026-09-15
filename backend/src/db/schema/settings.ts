import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const clinicSettings = sqliteTable('clinic_settings', {
  key: text('key').primaryKey(), // e.g. "global_shifts"
  value: text('value').notNull() // JSON string encoded settings configuration
});
