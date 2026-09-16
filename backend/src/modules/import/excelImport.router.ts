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
      duplicate_count INTEGER NOT NULL DEFAULT 0
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

      // Existing DB data for duplicate detection
      const existingPatients = db.select().from(patients).all();
      const existingMemberships = db.select().from(patientPracticeMemberships).all();
      
      const phoneToPatientMap = new Map<string, typeof existingPatients[0]>();
      for (const p of existingPatients) {
        const normMob = normalizeDigits(p.mobile.trim());
        if (normMob) phoneToPatientMap.set(normMob, p);
      }

      const pcPracticeToMemMap = new Map<string, typeof existingMemberships[0]>();
      for (const m of existingMemberships) {
        const normPc = normalizeDigits(m.physicalFileNumber.trim());
        if (normPc) pcPracticeToMemMap.set(`${m.practice}:${normPc}`, m);
      }

      const batchId = `imp-batch-${Date.now()}`;
      const todayStr = toStandardJalaliDbDate(new Date().toLocaleDateString('fa-IR')) || '1405-01-01';

      const stagingRecords: Array<typeof excelImportRecords.$inferInsert> = [];

      let validCount = 0;
      let missingNameCount = 0;
      let missingPcCount = 0;
      let invalidPhoneCount = 0;
      let duplicateCount = 0;

      // Temporary maps to track in-file duplicates across rows
      const filePhoneMap = new Map<string, number>(); // phone -> first row
      const filePcMap = new Map<string, number>(); // pc -> first row

      let rowIndex = 0;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rowIndex++;
        // Get raw values strictly by cell position: Cell 1 (A) = PC, Cell 2 (B) = Name, Cell 3 (C) = PN
        const rawCellA = row.getCell(1).text ? String(row.getCell(1).text).trim() : '';
        const rawCellB = row.getCell(2).text ? String(row.getCell(2).text).trim() : '';
        const rawCellC = row.getCell(3).text ? String(row.getCell(3).text).trim() : '';

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

        const normalizedPc = normalizeDigits(rawPc);
        const normalizedName = validatePersianName(rawName).normalized || normalizePersianChars(normalizeDigits(rawName));
        const normalizedPhone = normalizeDigits(rawPhone);

        const issues: string[] = [];
        let category: 'ready' | 'missing_name' | 'missing_pc' | 'invalid_phone' | 'duplicate' = 'ready';
        let duplicateTargetPatientId: string | null = null;
        let duplicateReason: string | null = null;

        // Validation 1: Name validation
        const nameVal = validatePersianName(rawName, 'نام بیمار');
        if (!nameVal.isValid) {
          issues.push(nameVal.error || 'نام بیمار وارد نشده یا معتبر نیست');
        }

        // Validation 2: PC validation
        if (!normalizedPc) {
          issues.push('شماره پرونده فیزیکی (PC) وارد نشده است');
        }

        // Validation 3: Phone validation
        const phoneVal = validateIranianMobile(rawPhone);
        if (!phoneVal.isValid) {
          issues.push(phoneVal.error || 'شماره همراه نامعتبر یا ناقص است');
        }

        // Duplicate Check 1: Phone match against existing DB patient
        if (normalizedPhone && phoneVal.isValid && phoneToPatientMap.has(normalizedPhone)) {
          const matched = phoneToPatientMap.get(normalizedPhone)!;
          duplicateTargetPatientId = matched.id;
          duplicateReason = `شماره همراه ${normalizedPhone} قبلاً برای بیمار «${matched.name}» (پرونده ${matched.fileNumber}) ثبت شده است.`;
        }

        // Duplicate Check 2: PC match in SAME practice against existing DB
        if (normalizedPc && pcPracticeToMemMap.has(`${practice}:${normalizedPc}`)) {
          const matchedMem = pcPracticeToMemMap.get(`${practice}:${normalizedPc}`)!;
          const matchedPt = existingPatients.find(p => p.id === matchedMem.patientId);
          duplicateTargetPatientId = matchedMem.patientId;
          duplicateReason = `شماره پرونده فیزیکی ${normalizedPc} در مطب ${practice === 'dental' ? 'دندانپزشکی' : 'زیبایی'} قبلاً به بیمار «${matchedPt?.name || 'نامشخص'}» تخصیص داده شده است.`;
        }

        // Duplicate Check 3: Duplicate within the SAME Excel file
        if (normalizedPhone && phoneVal.isValid && filePhoneMap.has(normalizedPhone)) {
          const firstRow = filePhoneMap.get(normalizedPhone)!;
          duplicateReason = `شماره همراه ${normalizedPhone} در ردیف ${firstRow} همین فایل اکسل نیز وجود دارد.`;
        } else if (normalizedPhone && phoneVal.isValid) {
          filePhoneMap.set(normalizedPhone, rowNumber);
        }

        if (normalizedPc && filePcMap.has(`${practice}:${normalizedPc}`)) {
          const firstRow = filePcMap.get(`${practice}:${normalizedPc}`)!;
          duplicateReason = `شماره پرونده ${normalizedPc} در ردیف ${firstRow} همین فایل اکسل تکرار شده است.`;
        } else if (normalizedPc) {
          filePcMap.set(`${practice}:${normalizedPc}`, rowNumber);
        }

        // Determine Primary Category
        if (duplicateReason || duplicateTargetPatientId) {
          category = 'duplicate';
          duplicateCount++;
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
          duplicateReason,
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
          duplicateCount
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
            duplicateCount
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

      const normalizedPc = normalizeDigits(newRawPc);
      const normalizedName = validatePersianName(newRawName).normalized || normalizePersianChars(normalizeDigits(newRawName));
      const normalizedPhone = normalizeDigits(newRawPhone);

      const issues: string[] = [];

      const nameVal = validatePersianName(newRawName, 'نام بیمار');
      if (!nameVal.isValid) issues.push(nameVal.error || 'نام بیمار وارد نشده یا معتبر نیست');

      if (!normalizedPc) issues.push('شماره پرونده فیزیکی (PC) وارد نشده است');

      const phoneVal = validateIranianMobile(newRawPhone);
      if (!phoneVal.isValid) issues.push(phoneVal.error || 'شماره همراه نامعتبر یا ناقص است');

      let category: 'ready' | 'missing_name' | 'missing_pc' | 'invalid_phone' | 'duplicate' = record.category as any;

      // Recalculate category if not resolving duplicate
      if (category !== 'duplicate' || record.duplicateResolution === 'separate_different_person') {
        if (!phoneVal.isValid) category = 'invalid_phone';
        else if (!nameVal.isValid) category = 'missing_name';
        else if (!normalizedPc) category = 'missing_pc';
        else category = 'ready';
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
        if (!phoneVal.isValid) newCategory = 'invalid_phone';
        else if (!nameVal.isValid) newCategory = 'missing_name';
        else if (!record.normalizedPc) newCategory = 'missing_pc';
        else newCategory = 'ready';
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
          const isResolvedSeparate = r.category === 'ready' || (r.category === 'duplicate' && r.duplicateResolution === 'separate_different_person');

          if (isResolvedMerged) {
            // Option 1: Merged Same Person -> Add new Practice Membership to existing Patient ID
            const targetPtId = r.duplicateTargetPatientId!;
            const physicalNum = r.normalizedPc || getNextGlobalFileNumber();

            // Check if membership already exists
            const existingMem = db.select()
              .from(patientPracticeMemberships)
              .where(and(
                eq(patientPracticeMemberships.patientId, targetPtId),
                eq(patientPracticeMemberships.practice, r.practice)
              ))
              .get();

            if (!existingMem) {
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

          } else if (isReady || isResolvedSeparate) {
            // Option 2: Create new Patient record with profileStatus = 'incomplete'
            const newPatientId = `pat-${Date.now()}-${r.excelRowNumber}`;
            const globalFileNum = getNextGlobalFileNumber();
            const physicalNum = r.normalizedPc || '101';
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
                profileStatus: 'incomplete', // Incomplete profile status workflow
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

        // Mark batch as committed
        db.update(excelImportBatches)
          .set({ status: 'committed' })
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
