import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'consumables' | 'rent' | 'salaries' | 'equipment' | 'utilities' | 'other'
  amount: integer('amount').notNull(), // Tomans
  date: text('date').notNull(), // Jalali YYYY-MM-DD
  practice: text('practice').notNull(), // 'aesthetic' | 'dental' | 'unified'
  recordedBy: text('recorded_by').notNull(),
  description: text('description'),
  receiptNumber: text('receipt_number')
});
