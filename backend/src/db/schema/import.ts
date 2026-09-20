import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const excelImportBatches = sqliteTable('excel_import_batches', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  createdAt: text('created_at').notNull(),
  status: text('status').notNull().default('preview'), // 'preview' | 'committed' | 'discarded'
  totalRecords: integer('total_records').notNull().default(0),
  validCount: integer('valid_count').notNull().default(0),
  missingNameCount: integer('missing_name_count').notNull().default(0),
  missingPcCount: integer('missing_pc_count').notNull().default(0),
  invalidPhoneCount: integer('invalid_phone_count').notNull().default(0),
  duplicateCount: integer('duplicate_count').notNull().default(0),
  pcConflictCount: integer('pc_conflict_count').notNull().default(0),
});

export const excelImportRecords = sqliteTable('excel_import_records', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').notNull().references(() => excelImportBatches.id, { onDelete: 'cascade' }),
  excelRowNumber: integer('excel_row_number').notNull(),
  practice: text('practice').notNull(), // 'aesthetic' | 'dental'
  rawPc: text('raw_pc'),
  rawName: text('raw_name'),
  rawPhone: text('raw_phone'),
  normalizedPc: text('normalized_pc'),
  normalizedName: text('normalized_name'),
  normalizedPhone: text('normalized_phone'),
  category: text('category').notNull(), // 'ready' | 'missing_name' | 'missing_pc' | 'invalid_phone' | 'duplicate' | 'pc_conflict'
  issues: text('issues').notNull().default('[]'), // JSON array string
  duplicateTargetPatientId: text('duplicate_target_patient_id'),
  duplicateTargetRecordId: text('duplicate_target_record_id'),
  duplicateReason: text('duplicate_reason'),
  duplicateResolution: text('duplicate_resolution').notNull().default('unresolved'), // 'unresolved' | 'merged_same_person' | 'separate_different_person' | 'ignored'
  importedPatientId: text('imported_patient_id'),
  status: text('status').notNull().default('staged') // 'staged' | 'committed' | 'ignored'
});
