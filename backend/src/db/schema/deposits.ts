import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { patients } from './patients';
import { appointments } from './appointments';
import { services } from './services';
import { paymentAccounts } from './paymentAccounts';

export const deposits = sqliteTable('deposits', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  serviceId: text('service_id').references(() => services.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  initialAmount: integer('initial_amount').notNull(), // Initial deposit amount in Tomans
  remainingAmount: integer('remaining_amount').notNull(), // Current available/unallocated/unrefunded amount
  status: text('status').notNull().default('active'), // 'active' | 'applied' | 'refunded' | 'partially_applied' | 'partially_refunded'
  paymentReceiptId: text('payment_receipt_id'), // Initial receipt id
  serviceObligationId: text('service_obligation_id'), // Linked obligation when applied
  paymentMethod: text('payment_method').notNull(), // 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'
  paymentAccountId: text('payment_account_id').references(() => paymentAccounts.id),
  posAccount: text('pos_account'),
  paymentDate: text('payment_date').notNull(), // Jalali YYYY-MM-DD
  notes: text('notes'),
  history: text('history'), // JSON array of audit logs: [{ action, timestamp, date, amount, details }]
  createdAt: text('created_at').notNull() // Jalali YYYY-MM-DD
});
