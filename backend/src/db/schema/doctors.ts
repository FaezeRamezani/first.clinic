import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const doctors = sqliteTable('doctors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  specialty: text('specialty').notNull(),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  phone: text('phone').notNull(),
  avatar: text('avatar'),
  workingHours: text('working_hours'),
  color: text('color').notNull()
});

export const doctorSchedules = sqliteTable('doctor_schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  doctorId: text('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  day: text('day').notNull(), // 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'
  morningActive: integer('morning_active', { mode: 'boolean' }).notNull().default(true),
  eveningActive: integer('evening_active', { mode: 'boolean' }).notNull().default(true)
}, (table) => [
  uniqueIndex('idx_doctor_day_schedule').on(table.doctorId, table.day)
]);
