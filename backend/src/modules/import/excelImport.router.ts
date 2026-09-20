import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { db, sqlite } from '../../config/database';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { excelImportBatches, excelImportRecords } from '../../db/schema/import';
import { eq, and, inArray } from 'drizzle-orm';
import { toStandardJalaliDbDate } from '../../utils/dateUtils';
import {
  validatePersianName,
  validateIranianMobile,
  normalizeIranianMobile,
  normalizeDigits,
  normalizePersianChars
} from '../../utils/validation';

// Ensure tables exist
function ensureImportTablesExist() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS excel_import_batches (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      practice TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'preview',
      total_records INTEGER NOT NULL DEFAULT 0,
      valid_count INTEGER NOT NULL DEFAULT 0,
      missing_name_count INTEGER NOT NULL DEFAULT 0,
      missing_pc_count INTEGER NOT NULL DEFAULT 0,
      invalid_phone_count INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      pc_conflict_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS excel_import_records (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES excel_import_batches(id) ON DELETE CASCADE,
      excel_row_number INTEGER NOT NULL,
      practice TEXT NOT NULL,
      raw_pc TEXT,
      raw_name TEXT,
      raw_phone TEXT,
      normalized_pc TEXT,
      normalized_name TEXT,
      normalized_phone TEXT,
      category TEXT NOT NULL,
      issues TEXT NOT NULL DEFAULT '[]',
      duplicate_target_patient_id TEXT,
      duplicate_target_record_id TEXT,
      duplicate_reason TEXT,
      duplicate_resolution TEXT NOT NULL DEFAULT 'unresolved',
      imported_patient_id TEXT,
      status TEXT NOT NULL DEFAULT 'staged'
    );
  `);

  try {
    sqlite.exec(`ALTER TABLE excel_import_batches ADD COLUMN pc_conflict_count INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists, ignore
  }
}

function getNextGlobalFileNumber(): string {
  const allPts = db.select().from(patients).all();
  let maxNum = 1000;
  for (const p of allPts) {
    if (p.fileNumber) {
      const match = p.fileNumber.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return `CL-${maxNum + 1}`;
}

export async function excelImportRouter(fastify: FastifyInstance) {
  ensureImportTablesExist();

  // GET /api/import/batches - List all import batches
  fastify.get('/batches', async (request, reply) => {
    try {
      const batches = db.select().from(excelImportBatches).all();
      return reply.send({ success: true, data: batches });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت لیست بارگذاری‌ها' }
      });
    }
  });

  // GET /api/import/batches/:id - Get batch details & staging records
  fastify.get('/batches/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const batch = db.select().from(excelImportBatches).where(eq(excelImportBatches.id, id)).get();

      if (!batch) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'اطلاعات بارگذاری یافت نشد' }
        });
      }

      const records = db.select().from(excelImportRecords).where(eq(excelImportRecords.batchId, id)).all();

      // Format records with parsed issues JSON & matched target patient details if duplicate
      const allPatientsMap = new Map(db.select().from(patients).all().map(p => [p.id, p]));
      const allMemberships = db.select().from(patientPracticeMemberships).all();

      const formattedRecords = records.map(r => {
        let parsedIssues: string[] = [];
        try {
          parsedIssues = JSON.parse(r.issues || '[]');
        } catch {
          parsedIssues = [];
        }

        let matchedPatient = null;
        if (r.duplicateTargetPatientId && allPatientsMap.has(r.duplicateTargetPatientId)) {
          const pt = allPatientsMap.get(r.duplicateTargetPatientId)!;
          const pMems = allMemberships.filter(m => m.patientId === pt.id);
          matchedPatient = {
            id: pt.id,
            name: pt.name,
            mobile: pt.mobile,
            fileNumber: pt.fileNumber,
            memberships: pMems
          };
        }

        return {
          ...r,
          issues: parsedIssues,
          matchedPatient
        };
      });

      return reply.send({
        success: true,
        data: {
          batch,
          records: formattedRecords
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت اطلاعات رکوردهای بارگذاری' }
      });
    }
  });

  // POST /api/import/upload - Parse Excel file and store in staging
  fastify.post('/upload', async (request, reply) => {
    try {
      let fileBuffer: Buffer | null = null;
      let fileName = 'patients_import.xlsx';
      let practice: 'aesthetic' | 'dental' = 'aesthetic';

      // Support multipart file upload or JSON payload with base64 content
      if (request.isMultipart()) {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file') {
            fileBuffer = await part.toBuffer();
            if (part.filename) fileName = part.filename;
          } else if (part.type === 'field') {
            if (part.fieldname === 'practice') {
              const val = part.value as string;
              if (val === 'aesthetic' || val === 'dental') practice = val;
            }
          }
        }
      } else {
        const body = request.body as { fileName?: string; practice: 'aesthetic' | 'dental'; fileBase64?: string };
        if (body.practice === 'aesthetic' || body.practice === 'dental') practice = body.practice;
        if (body.fileName) fileName = body.fileName;
        if (body.fileBase64) {
          fileBuffer = Buffer.from(body.fileBase64, 'base64');
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'فایل Excel ارسال نشده است' }
        });
      }

      // Load workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);


      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return reply.status(400).send({
          success: false,
          error: { code: 'EMPTY_EXCEL', message: 'فایل Excel انتخاب‌شده فاقد Sheet می‌باشد' }
        });
      }

      // Existing DB data for comprehensive duplicate detection
      const existingPatients = db.select().from(patients).all();
      const existingMemberships = db.select().from(patientPracticeMemberships).all();

      // 1. Phone -> Patient Map
      const dbPhoneMap = new Map<string, typeof existingPatients[0]>();
      for (const p of existingPatients) {
        const normMob = normalizeIranianMobile(p.mobile);
        if (normMob) dbPhoneMap.set(normMob, p);
      }

      // 2. PC in SAME practice -> Membership & Patient Map
      const dbPracticePcMap = new Map<string, { mem: typeof existingMemberships[0]; patient: typeof existingPatients[0] }>();
      for (const m of existingMemberships) {
        const normPc = normalizeDigits(m.physicalFileNumber.trim()).replace(/\.0+$/, '');
        const pt = existingPatients.find(p => p.id === m.patientId);
        if (normPc && pt) {
          dbPracticePcMap.set(`${m.practice}:${normPc}`, { mem: m, patient: pt });
        }
      }

      // 3. PC in ANY practice -> Memberships & Patients Map (Cross-practice lookup)
      const dbAllPcMap = new Map<string, Array<{ mem: typeof existingMemberships[0]; patient: typeof existingPatients[0] }>>();
      for (const m of existingMemberships) {
        const normPc = normalizeDigits(m.physicalFileNumber.trim()).replace(/\.0+$/, '');
        const pt = existingPatients.find(p => p.id === m.patientId);
        if (normPc && pt) {
          const list = dbAllPcMap.get(normPc) || [];
          list.push({ mem: m, patient: pt });
          dbAllPcMap.set(normPc, list);
        }
      }

      // 4. Name -> Patients Map
      const dbNameMap = new Map<string, typeof existingPatients[0][]>();
      for (const p of existingPatients) {
        const normName = normalizePersianChars(normalizeDigits(p.name.trim()));
        if (normName) {
          const list = dbNameMap.get(normName) || [];
          list.push(p);
          dbNameMap.set(normName, list);
        }
      }

      const batchId = `imp-batch-${Date.now()}`;
      const todayStr = toStandardJalaliDbDate(new Date().toLocaleDateString('fa-IR')) || '1405-01-01';

      const stagingRecords: Array<typeof excelImportRecords.$inferInsert> = [];

      let validCount = 0;
      let missingNameCount = 0;
      let missingPcCount = 0;
      let invalidPhoneCount = 0;
      let duplicateCount = 0;
      let pcConflictCount = 0;

      // Temporary maps to track in-file duplicates across rows
      const filePhoneMap = new Map<string, number>(); // phone -> first row
      const filePracticePcMap = new Map<string, number>(); // practice:pc -> first row

      let rowIndex = 0;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rowIndex++;

        // Helper to extract string text from Cell regardless of cell type (text, number, formula object)
        const getCellString = (cellIndex: number): string => {
          const cell = row.getCell(cellIndex);
          if (cell.value === null || cell.value === undefined) return '';
          if (typeof cell.value === 'object') {
            if ('result' in cell.value && cell.value.result !== undefined && cell.value.result !== null) {
              return String(cell.value.result).trim();
            }
            if ('text' in cell.value && cell.value.text) {
              return String(cell.value.text).trim();
            }
          }
          return String(cell.value).trim();
        };

        // Get raw values strictly by cell position: Cell 1 (A) = PC, Cell 2 (B) = Name, Cell 3 (C) = PN
        const rawCellA = getCellString(1);
        const rawCellB = getCellString(2);
        const rawCellC = getCellString(3);

        // Header detection heuristic for Row 1
        if (rowNumber === 1) {
          const lowerB = rawCellB.toLowerCase();
          const lowerA = rawCellA.toLowerCase();
          if (
            lowerB.includes('name') || lowerB.includes('نام') || lowerB.includes('بیمار') ||
            lowerA.includes('pc') || lowerA.includes('پرونده')
          ) {
            // Skip Header row
            return;
          }
        }

        const rawPc = rawCellA;
        const rawName = rawCellB;
        const rawPhone = rawCellC;

        const normalizedPc = normalizeDigits(rawPc).replace(/\.0+$/, '').trim();
        const nameVal = validatePersianName(rawName, 'نام بیمار');
        const normalizedName = nameVal.normalized || normalizePersianChars(normalizeDigits(rawName));
        const phoneVal = validateIranianMobile(rawPhone);
        const normalizedPhone = phoneVal.normalized;

        const issues: string[] = [];
        let category: 'ready' | 'missing_name' | 'missing_pc' | 'invalid_phone' | 'duplicate' | 'pc_conflict' = 'ready';
        let duplicateTargetPatientId: string | null = null;
        let duplicateReason: string | null = null;
        let pcConflictReason: string | null = null;

        // Validation 1: Name validation
        if (!nameVal.isValid) {
          issues.push(nameVal.error || 'نام بیمار وارد نشده یا معتبر نیست');
        }

        // Validation 2: PC validation
        if (!normalizedPc) {
          issues.push('شماره پرونده فیزیکی (PC) وارد نشده است');
        }

        // Validation 3: Phone validation
        if (!phoneVal.isValid) {
          issues.push(phoneVal.error || 'شماره همراه نامعتبر یا ناقص است');
        }

        // --- DUPLICATE & MATCH CHECKS (Database & In-File) ---

        // Check 1: Mobile match against DB Patient (Match level: Important)
        if (phoneVal.isValid && normalizedPhone && dbPhoneMap.has(normalizedPhone)) {
          const matched = dbPhoneMap.get(normalizedPhone)!;
          duplicateTargetPatientId = matched.id;
          duplicateReason = `شماره همراه ${normalizedPhone} قبلاً برای بیمار «${matched.name}» (پرونده ${matched.fileNumber}) در سیستم ثبت شده است.`;
        }

        // Check 4: Combined Name + Mobile match in DB
        if (!duplicateReason && normalizedName && normalizedPhone && phoneVal.isValid) {
          const nameMatchedPts = dbNameMap.get(normalizedName);
          if (nameMatchedPts && nameMatchedPts.length > 0) {
            const fullMatch = nameMatchedPts.find(p => normalizeIranianMobile(p.mobile) === normalizedPhone);
            if (fullMatch) {
              duplicateTargetPatientId = fullMatch.id;
              duplicateReason = `نام «${fullMatch.name}» و شماره همراه ${normalizedPhone} با پرونده موجود در سیستم مطابقت دارد.`;
            }
          }
        }

        // Check 5: Duplicate Mobile within the SAME Excel file
        if (!duplicateReason && phoneVal.isValid && normalizedPhone && filePhoneMap.has(normalizedPhone)) {
          const firstRow = filePhoneMap.get(normalizedPhone)!;
          duplicateReason = `شماره همراه ${normalizedPhone} در ردیف ${firstRow} همین فایل اکسل نیز وجود دارد.`;
        } else if (phoneVal.isValid && normalizedPhone) {
          filePhoneMap.set(normalizedPhone, rowNumber);
        }

        // --- PC CONFLICT CHECKS (Same practice PC collisions) ---
        if (normalizedPc) {
          const practiceLabel = practice === 'dental' ? 'دندانپزشکی' : 'زیبایی';
          // Check DB for PC conflict in SAME practice
          if (dbPracticePcMap.has(`${practice}:${normalizedPc}`)) {
            const matchedObj = dbPracticePcMap.get(`${practice}:${normalizedPc}`)!;
            // If PC belongs to a DIFFERENT patient (or duplicateTargetPatientId not set), mark PC Conflict
            if (!duplicateTargetPatientId || duplicateTargetPatientId !== matchedObj.patient.id) {
              pcConflictReason = `شماره پرونده فیزیکی ${normalizedPc} قبلاً در مطب ${practiceLabel} به یک پرونده دیگر («${matchedObj.patient.name}») اختصاص داده شده است.`;
            }
          }

          // Check duplicate PC within the SAME Excel file
          if (!pcConflictReason && filePracticePcMap.has(`${practice}:${normalizedPc}`)) {
            const firstRow = filePracticePcMap.get(`${practice}:${normalizedPc}`)!;
            pcConflictReason = `شماره پرونده ${normalizedPc} در ردیف ${firstRow} همین فایل اکسل تکرار شده است.`;
          } else if (!pcConflictReason) {
            filePracticePcMap.set(`${practice}:${normalizedPc}`, rowNumber);
          }
        }

        // Determine Primary Category
        if (duplicateReason || duplicateTargetPatientId) {
          category = 'duplicate';
          duplicateCount++;
        } else if (pcConflictReason) {
          category = 'pc_conflict';
          issues.push(pcConflictReason);
          pcConflictCount++;
        } else if (!phoneVal.isValid) {
          category = 'invalid_phone';
          invalidPhoneCount++;
        } else if (!nameVal.isValid) {
          category = 'missing_name';
          missingNameCount++;
        } else if (!normalizedPc) {
          category = 'missing_pc';
          missingPcCount++;
        } else {
          category = 'ready';
          validCount++;
        }

        const recId = `imp-rec-${Date.now()}-${rowNumber}-${Math.floor(Math.random() * 1000)}`;
        stagingRecords.push({
          id: recId,
          batchId,
          excelRowNumber: rowNumber,
          practice,
          rawPc: rawPc || null,
          rawName: rawName || null,
          rawPhone: rawPhone || null,
          normalizedPc: normalizedPc || null,
          normalizedName: normalizedName || null,
          normalizedPhone: normalizedPhone || null,
          category,
          issues: JSON.stringify(issues),
          duplicateTargetPatientId,
          duplicateTargetRecordId: null,
          duplicateReason: duplicateReason || pcConflictReason,
          duplicateResolution: 'unresolved',
          importedPatientId: null,
          status: 'staged'
        });
      });

      const totalRecords = stagingRecords.length;

      // DB Transaction to store batch & records atomically
      sqlite.transaction(() => {
        db.insert(excelImportBatches).values({
          id: batchId,
          fileName,
          practice,
          createdAt: todayStr,
          status: 'preview',
          totalRecords,
          validCount,
          missingNameCount,
          missingPcCount,
          invalidPhoneCount,
          duplicateCount,
          pcConflictCount
        }).run();

        if (stagingRecords.length > 0) {
          for (const rec of stagingRecords) {
            db.insert(excelImportRecords).values(rec).run();
          }
        }
      })();

      const createdBatch = db.select().from(excelImportBatches).where(eq(excelImportBatches.id, batchId)).get();

      return reply.status(201).send({
        success: true,
        data: {
          batch: createdBatch,
          summary: {
            totalRecords,
            validCount,
            missingNameCount,
            missingPcCount,
            invalidPhoneCount,
            duplicateCount,
            pcConflictCount
          }
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در بارگذاری و پردازش فایل Excel' }
      });
    }
  });

  // PATCH /api/import/records/:id - Update staging record fields (manually fix name/phone/PC)
  fastify.patch('/records/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const record = db.select().from(excelImportRecords).where(eq(excelImportRecords.id, id)).get();

      if (!record) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'رکورد مورد نظر یافت نشد' }
        });
      }

      const body = request.body as { rawPc?: string; rawName?: string; rawPhone?: string };

      const newRawPc = body.rawPc !== undefined ? body.rawPc : record.rawPc || '';
      const newRawName = body.rawName !== undefined ? body.rawName : record.rawName || '';
      const newRawPhone = body.rawPhone !== undefined ? body.rawPhone : record.rawPhone || '';

      const normalizedPc = normalizeDigits(newRawPc).replace(/\.0+$/, '').trim();
      const normalizedName = validatePersianName(newRawName).normalized || normalizePersianChars(normalizeDigits(newRawName));
      const normalizedPhone = normalizeDigits(newRawPhone);

      const issues: string[] = [];

      const nameVal = validatePersianName(newRawName, 'نام بیمار');
      if (!nameVal.isValid) issues.push(nameVal.error || 'نام بیمار وارد نشده یا معتبر نیست');

      if (!normalizedPc) issues.push('شماره پرونده فیزیکی (PC) وارد نشده است');

      const phoneVal = validateIranianMobile(newRawPhone);
      if (!phoneVal.isValid) issues.push(phoneVal.error || 'شماره همراه نامعتبر یا ناقص است');

      let category: 'ready' | 'missing_name' | 'missing_pc' | 'invalid_phone' | 'duplicate' | 'pc_conflict' = record.category as any;

      // Recalculate category if not resolving duplicate
      if (category !== 'duplicate' || record.duplicateResolution === 'separate_different_person') {
        const existingPcMem = normalizedPc ? db.select()
          .from(patientPracticeMemberships)
          .where(and(
            eq(patientPracticeMemberships.practice, record.practice),
            eq(patientPracticeMemberships.physicalFileNumber, normalizedPc)
          ))
          .get() : null;

        if (existingPcMem) {
          category = 'pc_conflict';
          const ptName = db.select().from(patients).where(eq(patients.id, existingPcMem.patientId)).get()?.name || '';
          const practiceLabel = record.practice === 'dental' ? 'دندانپزشکی' : 'زیبایی';
          issues.push(`شماره پرونده فیزیکی ${normalizedPc} قبلاً در مطب ${practiceLabel} به یک پرونده دیگر${ptName ? ` («${ptName}»)` : ''} اختصاص داده شده است.`);
        } else if (!phoneVal.isValid) {
          category = 'invalid_phone';
        } else if (!nameVal.isValid) {
          category = 'missing_name';
        } else if (!normalizedPc) {
          category = 'missing_pc';
        } else {
          category = 'ready';
        }
      }

      db.update(excelImportRecords)
        .set({
          rawPc: newRawPc,
          rawName: newRawName,
          rawPhone: newRawPhone,
          normalizedPc,
          normalizedName,
          normalizedPhone,
          category,
          issues: JSON.stringify(issues)
        })
        .where(eq(excelImportRecords.id, id))
        .run();

      const updated = db.select().from(excelImportRecords).where(eq(excelImportRecords.id, id)).get();

      return reply.send({
        success: true,
        data: {
          ...updated,
          issues: JSON.parse(updated?.issues || '[]')
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ویرایش رکورد' }
      });
    }
  });

  // POST /api/import/records/:id/resolve-duplicate - Resolve duplicate decision
  fastify.post('/records/:id/resolve-duplicate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { resolution, targetPatientId } = request.body as {
        resolution: 'merged_same_person' | 'separate_different_person' | 'ignored';
        targetPatientId?: string;
      };

      const record = db.select().from(excelImportRecords).where(eq(excelImportRecords.id, id)).get();
      if (!record) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'رکورد مورد نظر یافت نشد' }
        });
      }

      let newCategory = record.category;
      if (resolution === 'separate_different_person') {
        // Re-evaluate if valid
        const nameVal = validatePersianName(record.rawName);
        const phoneVal = validateIranianMobile(record.rawPhone);

        const existingPcMem = record.normalizedPc ? db.select()
          .from(patientPracticeMemberships)
          .where(and(
            eq(patientPracticeMemberships.practice, record.practice),
            eq(patientPracticeMemberships.physicalFileNumber, record.normalizedPc)
          ))
          .get() : null;

        if (existingPcMem) {
          newCategory = 'pc_conflict';
        } else if (!phoneVal.isValid) {
          newCategory = 'invalid_phone';
        } else if (!nameVal.isValid) {
          newCategory = 'missing_name';
        } else if (!record.normalizedPc) {
          newCategory = 'missing_pc';
        } else {
          newCategory = 'ready';
        }
      }

      db.update(excelImportRecords)
        .set({
          duplicateResolution: resolution,
          duplicateTargetPatientId: targetPatientId || record.duplicateTargetPatientId,
          category: newCategory
        })
        .where(eq(excelImportRecords.id, id))
        .run();

      const updated = db.select().from(excelImportRecords).where(eq(excelImportRecords.id, id)).get();
      return reply.send({
        success: true,
        data: {
          ...updated,
          issues: JSON.parse(updated?.issues || '[]')
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ثبت تصمیم تکرار' }
      });
    }
  });

  // POST /api/import/batches/:id/commit - Final commit of valid records to patients DB
  fastify.post('/batches/:id/commit', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const batch = db.select().from(excelImportBatches).where(eq(excelImportBatches.id, id)).get();

      if (!batch) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'دسته بارگذاری یافت نشد' }
        });
      }

      if (batch.status === 'committed') {
        return reply.status(400).send({
          success: false,
          error: { code: 'ALREADY_COMMITTED', message: 'این بارگذاری قبلاً تأیید و وارد سیستم شده است' }
        });
      }

      const records = db.select().from(excelImportRecords).where(eq(excelImportRecords.batchId, id)).all();
      const todayStr = toStandardJalaliDbDate(new Date().toLocaleDateString('fa-IR')) || '1405-01-01';

      let importedPatientsCount = 0;
      let updatedMembershipsCount = 0;

      // ATOMIC TRANSACTION FOR MAIN DB COMMIT
      sqlite.transaction(() => {
        for (const r of records) {
          // Commit only valid ready records OR resolved duplicates
          const isReady = r.category === 'ready';
          const isResolvedMerged = r.category === 'duplicate' && r.duplicateResolution === 'merged_same_person' && r.duplicateTargetPatientId;
          const isResolvedSeparate = (r.category === 'duplicate' && r.duplicateResolution === 'separate_different_person') || isReady;

          if (isResolvedMerged) {
            // Option 1: Merged Same Person -> Add new Practice Membership to existing Patient ID
            const targetPtId = r.duplicateTargetPatientId!;
            const physicalNum = r.normalizedPc || getNextGlobalFileNumber();

            // Check if (practice + physicalFileNumber) ALREADY exists in DB
            const existingMemForPc = db.select()
              .from(patientPracticeMemberships)
              .where(and(
                eq(patientPracticeMemberships.practice, r.practice),
                eq(patientPracticeMemberships.physicalFileNumber, physicalNum)
              ))
              .get();

            if (existingMemForPc) {
              if (existingMemForPc.patientId === targetPtId) {
                // Same patient already has this practice membership with this PC
                db.update(excelImportRecords)
                  .set({ status: 'committed', importedPatientId: targetPtId })
                  .where(eq(excelImportRecords.id, r.id))
                  .run();
                updatedMembershipsCount++;
              } else {
                // Conflict! This PC in this practice belongs to ANOTHER patient!
                // Do NOT insert! Flag record as pc_conflict so backend does not crash with 500 error.
                let issuesList: string[] = [];
                try { issuesList = JSON.parse(r.issues || '[]'); } catch { issuesList = []; }
                const practiceLabel = r.practice === 'dental' ? 'دندانپزشکی' : 'زیبایی';
                issuesList.push(`تعارض شماره پرونده: شماره ${physicalNum} قبلاً در مطب ${practiceLabel} به بیمار دیگری اختصاص یافته است.`);

                db.update(excelImportRecords)
                  .set({
                    category: 'pc_conflict',
                    issues: JSON.stringify(issuesList),
                    duplicateReason: `شماره پرونده فیزیکی ${physicalNum} قبلاً به بیمار دیگری اختصاص یافته است.`
                  })
                  .where(eq(excelImportRecords.id, r.id))
                  .run();
              }
            } else {
              // Check if targetPtId already has a membership in r.practice under a different PC
              const existingMemForPt = db.select()
                .from(patientPracticeMemberships)
                .where(and(
                  eq(patientPracticeMemberships.patientId, targetPtId),
                  eq(patientPracticeMemberships.practice, r.practice)
                ))
                .get();

              if (!existingMemForPt) {
                db.insert(patientPracticeMemberships)
                  .values({
                    patientId: targetPtId,
                    practice: r.practice,
                    physicalFileNumber: physicalNum,
                    joinedAt: todayStr
                  })
                  .run();
                updatedMembershipsCount++;
              }

              db.update(excelImportRecords)
                .set({ status: 'committed', importedPatientId: targetPtId })
                .where(eq(excelImportRecords.id, r.id))
                .run();
            }

          } else if (isResolvedSeparate || isReady) {
            const physicalNum = r.normalizedPc || '101';

            // Check if (practice + physicalFileNumber) ALREADY exists in DB
            const existingMemForPc = db.select()
              .from(patientPracticeMemberships)
              .where(and(
                eq(patientPracticeMemberships.practice, r.practice),
                eq(patientPracticeMemberships.physicalFileNumber, physicalNum)
              ))
              .get();

            if (existingMemForPc) {
              // Conflict! This PC in this practice belongs to ANOTHER patient!
              // Do NOT insert! Flag record as pc_conflict so backend does not crash with 500 error.
              let issuesList: string[] = [];
              try { issuesList = JSON.parse(r.issues || '[]'); } catch { issuesList = []; }
              const practiceLabel = r.practice === 'dental' ? 'دندانپزشکی' : 'زیبایی';
              issuesList.push(`تعارض شماره پرونده: شماره ${physicalNum} قبلاً در مطب ${practiceLabel} به بیمار دیگری اختصاص یافته است.`);

              db.update(excelImportRecords)
                .set({
                  category: 'pc_conflict',
                  issues: JSON.stringify(issuesList),
                  duplicateReason: `شماره پرونده فیزیکی ${physicalNum} قبلاً به بیمار دیگری اختصاص یافته است.`
                })
                .where(eq(excelImportRecords.id, r.id))
                .run();
            } else {
              // Option 2: Create new Patient record with profileStatus = 'completed'
              const newPatientId = `pat-${Date.now()}-${r.excelRowNumber}`;
              const globalFileNum = getNextGlobalFileNumber();
              const phone = r.normalizedPhone || '09120000000';
              const name = r.normalizedName || r.rawName || 'بیمار جدید';

              // Insert into patients table
              db.insert(patients)
                .values({
                  id: newPatientId,
                  fileNumber: globalFileNum,
                  nationalId: null,
                  name,
                  mobile: phone,
                  gender: null,
                  birthDate: null,
                  primaryPractice: r.practice,
                  allergies: '[]',
                  medicalNotes: null,
                  emergencyContact: null,
                  profileStatus: 'completed',
                  username: phone,
                  password: `cl-${Math.floor(100000 + Math.random() * 900000)}`,
                  createdAt: todayStr
                })
                .run();

              // Insert Practice Membership
              db.insert(patientPracticeMemberships)
                .values({
                  patientId: newPatientId,
                  practice: r.practice,
                  physicalFileNumber: physicalNum,
                  joinedAt: todayStr
                })
                .run();

              db.update(excelImportRecords)
                .set({ status: 'committed', importedPatientId: newPatientId })
                .where(eq(excelImportRecords.id, r.id))
                .run();

              importedPatientsCount++;
            }
          }
        }

        // Check if all records in batch are committed
        const remainingStaged = db.select().from(excelImportRecords).where(and(eq(excelImportRecords.batchId, id), eq(excelImportRecords.status, 'staged'))).all();
        const batchStatus = remainingStaged.length === 0 ? 'committed' : 'partial';

        // Update batch status
        db.update(excelImportBatches)
          .set({ status: batchStatus })
          .where(eq(excelImportBatches.id, id))
          .run();
      })();

      return reply.send({
        success: true,
        data: {
          importedPatientsCount,
          updatedMembershipsCount,
          message: `${importedPatientsCount} بیمار جدید با موفقیت وارد سیستم شدند.`
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ثبت نهایی رکوردهای Excel' }
      });
    }
  });

  // DELETE /api/import/batches/:id - Discard batch
  fastify.delete('/batches/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      db.delete(excelImportBatches).where(eq(excelImportBatches.id, id)).run();

      return reply.send({
        success: true,
        data: { id },
        message: 'دسته‌بندی اکسل با موفقیت حذف گردید'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در حذف دسته‌بندی' }
      });
    }
  });
}
