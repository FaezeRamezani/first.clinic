import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  price: integer('price').notNull(), // In Tomans
  duration: integer('duration').notNull(), // In minutes
  description: text('description'),
  defaultPaymentTermDays: integer('default_payment_term_days').notNull().default(10),
  active: integer('active', { mode: 'boolean' }).notNull().default(true)
});
