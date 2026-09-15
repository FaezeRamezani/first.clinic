import { sqliteTable, text, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  fileNumber: text('file_number'), // Global Patient File/System Number
  nationalId: text('national_id'),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  gender: text('gender'), // 'female' | 'male'
  birthDate: text('birth_date'), // Jalali YYYY-MM-DD
  primaryPractice: text('primary_practice'), // 'aesthetic' | 'dental'
  allergies: text('allergies'), // JSON string array
  medicalNotes: text('medical_notes'),
  emergencyContact: text('emergency_contact'), // JSON string object
  profileStatus: text('profile_status').notNull().default('completed'), // 'incomplete' | 'completed'
  username: text('username'),
  password: text('password'),
  createdAt: text('created_at').notNull() // Jalali YYYY-MM-DD
});

export const patientPracticeMemberships = sqliteTable('patient_practice_memberships', {
  patientId: text('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  physicalFileNumber: text('physical_file_number').notNull(),
  joinedAt: text('joined_at').notNull() // Jalali YYYY-MM-DD
}, (table) => [
  primaryKey({ columns: [table.patientId, table.practice] }),
  uniqueIndex('idx_practice_physical_file').on(table.practice, table.physicalFileNumber)
]);
