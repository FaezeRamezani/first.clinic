import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { patients } from './patients';
import { appointments } from './appointments';
import { services } from './services';
import { paymentAccounts } from './paymentAccounts';

export const financialObligations = sqliteTable('financial_obligations', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  serviceId: text('service_id').references(() => services.id),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  serviceDate: text('service_date').notNull(), // Jalali YYYY-MM-DD
  recordDate: text('record_date').notNull(), // Jalali YYYY-MM-DD
  serviceName: text('service_name').notNull(),
  totalCost: integer('total_cost').notNull(), // Tomans
  discount: integer('discount').notNull().default(0), // Tomans
  netCost: integer('net_cost').notNull(), // totalCost - discount
  dueDate: text('due_date'), // Jalali YYYY-MM-DD
  notes: text('notes')
});

export const paymentReceipts = sqliteTable('payment_receipts', {
  id: text('id').primaryKey(),
  obligationId: text('obligation_id').references(() => financialObligations.id),
  patientId: text('patient_id').notNull().references(() => patients.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  recordDate: text('record_date').notNull(), // Jalali YYYY-MM-DD
  serviceDate: text('service_date'), // Jalali YYYY-MM-DD
  paidAmount: integer('paid_amount').notNull(), // Tomans
  paymentMethod: text('payment_method').notNull(), // 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'
  paymentAccountId: text('payment_account_id').references(() => paymentAccounts.id),
  posAccount: text('pos_account'), // Label text e.g. "بانک ایران زمین"
  timestamp: text('timestamp'), // e.g. "14:30"
  debtDueDate: text('debt_due_date'), // Jalali YYYY-MM-DD
  notes: text('notes')
});
