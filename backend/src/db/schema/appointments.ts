import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { patients } from './patients';
import { doctors } from './doctors';
import { services } from './services';

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  doctorId: text('doctor_id').notNull().references(() => doctors.id),
  serviceId: text('service_id').references(() => services.id),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  date: text('date').notNull(), // Jalali YYYY-MM-DD
  timeSlot: text('time_slot').notNull(), // e.g. "10:30"
  duration: integer('duration').notNull(), // In minutes
  status: text('status').notNull(), // 'pending' | 'checked_in' | 'completed' | 'canceled' | 'rescheduled' | 'unsettled'
  presenceStatus: text('presence_status'), // 'present' | 'absent' | 'pending'
  notes: text('notes'),
  cabinetNumber: text('cabinet_number'),
  cancellationReason: text('cancellation_reason'),
  cancellationType: text('cancellation_type'), // 'rescheduled' | 'no_replacement'
  canceledAt: text('canceled_at'), // Jalali YYYY-MM-DD
  previousAppointmentId: text('previous_appointment_id'),
  replacementAppointmentId: text('replacement_appointment_id')
});
