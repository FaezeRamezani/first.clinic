import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { patients } from './patients';
import { doctors } from './doctors';

export const followUpTasks = sqliteTable('follow_up_tasks', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').references(() => patients.id),
  doctorId: text('doctor_id').references(() => doctors.id),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental' | 'unified'
  type: text('type').notNull(), // 'post_op' | 'lab_result' | 'checkup' | 'debt_reminder' | 'manual' | 'operational'
  title: text('title'),
  description: text('description').notNull(),
  dueDate: text('due_date').notNull(), // Jalali YYYY-MM-DD
  status: text('status').notNull(), // 'pending' | 'called_no_answer' | 'called_confirmed' | 'rescheduled' | 'completed'
  resultNote: text('result_note'),
  updatedAt: text('updated_at'),
  createdAt: text('created_at'),
  completedAt: text('completed_at')
});
