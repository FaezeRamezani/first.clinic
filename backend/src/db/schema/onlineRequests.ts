import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { doctors } from './doctors';
import { appointments } from './appointments';

export const onlineRequests = sqliteTable('online_requests', {
  id: text('id').primaryKey(),
  patientName: text('patient_name').notNull(),
  mobile: text('mobile').notNull(),
  nationalId: text('national_id'),
  targetPractice: text('target_practice').notNull(), // 'aesthetic' | 'dental'
  doctorId: text('doctor_id').notNull().references(() => doctors.id),
  requestedDate: text('requested_date').notNull(), // Jalali YYYY-MM-DD
  requestedTimeSlot: text('requested_time_slot').notNull(),
  requestType: text('request_type'), // 'visit' | 'consultation'
  proposedDates: text('proposed_dates'), // JSON string array
  notes: text('notes'),
  status: text('status').notNull(), // 'pending' | 'approved' | 'rejected'
  rejectionReason: text('rejection_reason'),
  rejectedAt: text('rejected_at'),
  createdAt: text('created_at').notNull(),
  appointmentId: text('appointment_id').references(() => appointments.id)
});
