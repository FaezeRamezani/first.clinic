import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const paymentAccounts = sqliteTable('payment_accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  practice: text('practice').notNull() // 'aesthetic' | 'dental'
});
