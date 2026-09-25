import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, sqlite } from '../../config/database';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { financialObligations, paymentReceipts } from '../../db/schema/finance';
import { appointments } from '../../db/schema/appointments';
import { followUpTasks } from '../../db/schema/followups';
import { excelImportRecords } from '../../db/schema/import';
import { eq, and } from 'drizzle-orm';
import { toStandardJalaliDbDate } from '../../utils/dateUtils';
import { 
  validatePersianName, 
  validateIranianMobile, 
  validateIranianNationalId, 
  normalizeDigits, 
  normalizePersianChars, 
  sanitizeFreeText 
} from '../../utils/validation';

const createPatientSchema = z.object({
  name: z.string().superRefine((val, ctx) => {
    const res = validatePersianName(val, 'نام بیمار');
    if (!res.isValid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error });
    }
  }).transform(val => validatePersianName(val).normalized),

  mobile: z.string().superRefine((val, ctx) => {
    const res = validateIranianMobile(val);
    if (!res.isValid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error });
    }
  }).transform(val => validateIranianMobile(val).normalized),

  nationalId: z.string().optional().nullable().superRefine((val, ctx) => {
    if (!val) return;
    const res = validateIranianNationalId(val, true);
    if (!res.isValid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error });
    }
  }).transform(val => val ? validateIranianNationalId(val, true).normalized : val),

  gender: z.enum(['female', 'male']).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  primaryPractice: z.enum(['aesthetic', 'dental']).optional().default('aesthetic'),
  allergies: z.array(z.string()).optional().default([]),
  medicalNotes: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 1000)),
  emergencyContact: z.object({
    name: z.string().optional().nullable().transform(val => val ? normalizePersianChars(normalizeDigits(val.trim())) : val),
    phone: z.string().optional().nullable().transform(val => val ? normalizeDigits(val.trim()) : val),
    relation: z.string().optional().nullable().transform(val => val ? sanitizeFreeText(val, 100) : val)
  }).optional().nullable(),
  profileStatus: z.enum(['incomplete', 'completed', 'temp']).optional().default('completed'),
  customFileNumber: z.string().optional().nullable().transform(val => val ? normalizeDigits(val.trim()) : val),
  memberships: z.array(z.object({
    practice: z.enum(['aesthetic', 'dental']),
    physicalFileNumber: z.string().optional(),
    joinedAt: z.string().optional()
  })).optional()
});

const updatePatientSchema = createPatientSchema.partial();

const addMembershipSchema = z.object({
  practice: z.enum(['aesthetic', 'dental']),
  customFileNumber: z.string().optional().nullable()
});

const updatePhysicalFileSchema = z.object({
  physicalFileNumber: z.string().min(1, 'شماره پرونده فیزیکی الزامی است')
});

const mergePatientsSchema = z.object({
  patientAId: z.string().min(1, 'شناسه پرونده اول الزامی است'),
  patientBId: z.string().min(1, 'شناسه پرونده دوم الزامی است'),
  primaryPatientId: z.string().min(1, 'شناسه پرونده اصلی الزامی است')
});

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

function getNextPhysicalFileNumber(practice: 'aesthetic' | 'dental'): string {
  const memberships = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.practice, practice)).all();
  let maxNum = 100;
  for (const m of memberships) {
    if (m.physicalFileNumber) {
      const parsed = parseInt(m.physicalFileNumber.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return String(maxNum + 1);
}

function formatPatientData(p: typeof patients.$inferSelect, memberships: (typeof patientPracticeMemberships.$inferSelect)[]) {
  let allergiesArr: string[] = [];
  if (p.allergies) {
    try {
      allergiesArr = JSON.parse(p.allergies);
    } catch {
      allergiesArr = [];
    }
  }

  let emergencyObj = { name: '-', phone: '-', relation: '-' };
  if (p.emergencyContact) {
    try {
      emergencyObj = JSON.parse(p.emergencyContact);
    } catch {
      emergencyObj = { name: '-', phone: '-', relation: '-' };
    }
  }

  const formattedMemberships = memberships.map(m => ({
    practice: m.practice as 'aesthetic' | 'dental',
    physicalFileNumber: m.physicalFileNumber,
    joinedAt: m.joinedAt,
    phone: m.phone || undefined
  }));

  const allObligations = db.select().from(financialObligations).where(eq(financialObligations.patientId, p.id)).all();
  const allReceipts = db.select().from(paymentReceipts).where(eq(paymentReceipts.patientId, p.id)).all();
  const totalObligationNet = allObligations.reduce((sum, o) => sum + (o.netCost || 0), 0);
  const totalPaid = allReceipts.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const derivedBalance = totalPaid - totalObligationNet;

  return {
    id: p.id,
    fileNumber: p.fileNumber || undefined,
    nationalId: p.nationalId || undefined,
    name: p.name,
    mobile: p.mobile,
    gender: (p.gender as 'female' | 'male') || undefined,
    birthDate: p.birthDate || undefined,
    primaryPractice: (p.primaryPractice as 'aesthetic' | 'dental') || undefined,
    memberships: formattedMemberships,
    allergies: allergiesArr,
    medicalNotes: p.medicalNotes || '',
    emergencyContact: emergencyObj,
    balance: derivedBalance, // 100% derived from financial_obligations and payment_receipts
    createdAt: p.createdAt,
    profileStatus: (p.profileStatus as 'incomplete' | 'completed') || 'completed',
    loginCredentials: {
      username: p.username || p.mobile,
      password: p.password || undefined
    }
  };
}

export async function patientsRouter(fastify: FastifyInstance) {
  // GET /api/patients
  fastify.get('/', async (request, reply) => {
    try {
      const { practice, searchQuery, profileStatus } = request.query as {
        practice?: string;
        searchQuery?: string;
        profileStatus?: string;
      };

      let allPatients = db.select().from(patients).all();
      const allMemberships = db.select().from(patientPracticeMemberships).all();

      // Practice filter
      if (practice && (practice === 'aesthetic' || practice === 'dental')) {
        const patientIdsInPractice = new Set(
          allMemberships.filter(m => m.practice === practice).map(m => m.patientId)
        );
        allPatients = allPatients.filter(p => patientIdsInPractice.has(p.id) || p.primaryPractice === practice);
      }

      // ProfileStatus filter
      if (profileStatus && (profileStatus === 'completed' || profileStatus === 'incomplete')) {
        allPatients = allPatients.filter(p => p.profileStatus === profileStatus);
      }

      // Server-side search filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        allPatients = allPatients.filter(p => {
          const matchName = p.name.toLowerCase().includes(q);
          const matchMobile = p.mobile.includes(q);
          const matchNational = p.nationalId ? p.nationalId.includes(q) : false;
          const matchId = p.id.toLowerCase().includes(q);
          const matchGlobalFile = p.fileNumber ? p.fileNumber.toLowerCase().includes(q) : false;
          
          const pMems = allMemberships.filter(m => m.patientId === p.id);
          const matchPhysicalFile = pMems.some(m => m.physicalFileNumber.toLowerCase().includes(q));
          const matchMembershipPhone = pMems.some(m => m.phone && m.phone.includes(q));

          return matchName || matchMobile || matchMembershipPhone || matchNational || matchId || matchGlobalFile || matchPhysicalFile;
        });
      }

      const formattedList = allPatients.map(p => {
        const pMems = allMemberships.filter(m => m.patientId === p.id);
        return formatPatientData(p, pMems);
      });

      return reply.send({
        success: true,
        data: formattedList
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت لیست بیماران' }
      });
    }
  });

  // GET /api/patients/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const patient = db.select().from(patients).where(eq(patients.id, id)).get();

      if (!patient) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'پرونده بیمار یافت نشد' }
        });
      }

      const pMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, id)).all();
      return reply.send({
        success: true,
        data: formatPatientData(patient, pMems)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت پرونده بیمار' }
      });
    }
  });

  // POST /api/patients
  fastify.post('/', async (request, reply) => {
    try {
      const parseResult = createPatientSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات بیمار معتبر نیست' }
        });
      }

      const body = parseResult.data;
      const targetPractice = body.primaryPractice || 'aesthetic';

      // Atomic DB Transaction
      let createdPatientId = '';
      let errorResponse: { statusCode: number; payload: any } | null = null;

      sqlite.transaction(() => {
        // Check for duplicate physical file number if customFileNumber provided
        if (body.customFileNumber) {
          const existingMemberWithNum = db.select()
            .from(patientPracticeMemberships)
            .where(and(
              eq(patientPracticeMemberships.practice, targetPractice),
              eq(patientPracticeMemberships.physicalFileNumber, body.customFileNumber)
            ))
            .get();

          if (existingMemberWithNum) {
            errorResponse = {
              statusCode: 409,
              payload: {
                success: false,
                error: { code: 'DUPLICATE_FILE_NUMBER', message: `شماره پرونده فیزیکی ${body.customFileNumber} در مطب قبلاً تخصیص داده شده است.` }
              }
            };
            return;
          }
        }

        const newPatientId = `pat-${Date.now()}`;
        createdPatientId = newPatientId;
        const globalFileNum = getNextGlobalFileNumber();

        const physicalNum = body.customFileNumber || getNextPhysicalFileNumber(targetPractice);
        const todayStr = toStandardJalaliDbDate(new Date().toLocaleDateString('fa-IR'));

        // Insert Patient
        db.insert(patients)
          .values({
            id: newPatientId,
            fileNumber: globalFileNum,
            nationalId: body.nationalId || null,
            name: body.name.trim(),
            mobile: body.mobile.trim(),
            gender: body.gender || 'female',
            birthDate: body.birthDate ? toStandardJalaliDbDate(body.birthDate) : null,
            primaryPractice: targetPractice,
            allergies: body.allergies ? JSON.stringify(body.allergies) : '[]',
            medicalNotes: body.medicalNotes || null,
            emergencyContact: body.emergencyContact ? JSON.stringify(body.emergencyContact) : null,
            profileStatus: body.profileStatus || 'completed',
            username: body.mobile.trim(),
            password: `cl-${Math.floor(100000 + Math.random() * 900000)}`,
            createdAt: todayStr || '1405-01-01'
          })
          .run();

        // Insert initial Membership
        db.insert(patientPracticeMemberships)
          .values({
            patientId: newPatientId,
            practice: targetPractice,
            physicalFileNumber: physicalNum,
            joinedAt: todayStr || '1405-01-01'
          })
          .run();
      })();

      if (errorResponse) {
        return reply.status((errorResponse as any).statusCode).send((errorResponse as any).payload);
      }

      const created = db.select().from(patients).where(eq(patients.id, createdPatientId)).get();
      const pMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, createdPatientId)).all();

      return reply.status(201).send({
        success: true,
        data: formatPatientData(created!, pMems)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در تشکیل پرونده بیمار جدید' }
      });
    }
  });

  // PATCH /api/patients/:id
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = db.select().from(patients).where(eq(patients.id, id)).get();

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'پرونده بیمار یافت نشد' }
        });
      }

      const parseResult = updatePatientSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات بیمار معتبر نیست' }
        });
      }

      const body = parseResult.data;
      const updatedValues: Partial<typeof existing> = {};

      if (body.name !== undefined) updatedValues.name = body.name.trim();
      if (body.mobile !== undefined) updatedValues.mobile = body.mobile.trim();
      if (body.nationalId !== undefined) updatedValues.nationalId = body.nationalId || null;
      if (body.gender !== undefined) updatedValues.gender = body.gender || null;
      if (body.birthDate !== undefined) updatedValues.birthDate = body.birthDate ? toStandardJalaliDbDate(body.birthDate) : null;
      if (body.primaryPractice !== undefined) updatedValues.primaryPractice = body.primaryPractice || null;
      if (body.allergies !== undefined) updatedValues.allergies = JSON.stringify(body.allergies);
      if (body.medicalNotes !== undefined) updatedValues.medicalNotes = body.medicalNotes || null;
      if (body.emergencyContact !== undefined) updatedValues.emergencyContact = body.emergencyContact ? JSON.stringify(body.emergencyContact) : null;
      if (body.profileStatus !== undefined) updatedValues.profileStatus = body.profileStatus;

      db.update(patients)
        .set(updatedValues)
        .where(eq(patients.id, id))
        .run();

      const updated = db.select().from(patients).where(eq(patients.id, id)).get();
      const pMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, id)).all();

      return reply.send({
        success: true,
        data: formatPatientData(updated!, pMems)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ویرایش اطلاعات بیمار' }
      });
    }
  });

  // POST /api/patients/:id/memberships
  fastify.post('/:id/memberships', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const patient = db.select().from(patients).where(eq(patients.id, id)).get();

      if (!patient) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'پرونده بیمار یافت نشد' }
        });
      }

      const parseResult = addMembershipSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات عضویت مطب معتبر نیست' }
        });
      }

      const { practice, customFileNumber } = parseResult.data;

      // Check duplicate membership for same practice
      const existingMem = db.select()
        .from(patientPracticeMemberships)
        .where(and(
          eq(patientPracticeMemberships.patientId, id),
          eq(patientPracticeMemberships.practice, practice)
        ))
        .get();

      if (existingMem) {
        return reply.status(409).send({
          success: false,
          error: { code: 'DUPLICATE_MEMBERSHIP', message: 'این بیمار از قبل در این مطب دارای پرونده (عضویت) می‌باشد و نیازی به ایجاد پرونده جدید ندارد.' }
        });
      }

      const physicalNum = customFileNumber || getNextPhysicalFileNumber(practice);

      // Check unique constraint for physical file number in practice
      const occupiedMem = db.select()
        .from(patientPracticeMemberships)
        .where(and(
          eq(patientPracticeMemberships.practice, practice),
          eq(patientPracticeMemberships.physicalFileNumber, physicalNum)
        ))
        .get();

      if (occupiedMem) {
        return reply.status(409).send({
          success: false,
          error: { code: 'DUPLICATE_FILE_NUMBER', message: `شماره پرونده فیزیکی ${physicalNum} در این مطب قبلاً استفاده شده است.` }
        });
      }

      const todayStr = toStandardJalaliDbDate(new Date().toLocaleDateString('fa-IR'));

      db.insert(patientPracticeMemberships)
        .values({
          patientId: id,
          practice: practice,
          physicalFileNumber: physicalNum,
          joinedAt: todayStr || '1405-01-01'
        })
        .run();

      const updatedMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, id)).all();

      return reply.status(201).send({
        success: true,
        data: formatPatientData(patient, updatedMems)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در افزودن عضویت مطب جدید' }
      });
    }
  });

  // PATCH /api/patients/:id/memberships/:practice
  fastify.patch('/:id/memberships/:practice', async (request, reply) => {
    try {
      const { id, practice } = request.params as { id: string; practice: string };
      if (practice !== 'aesthetic' && practice !== 'dental') {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PRACTICE', message: 'نوع مطب معتبر نیست' }
        });
      }

      const parseResult = updatePhysicalFileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'شماره پرونده فیزیکی وارد شده معتبر نیست' }
        });
      }

      const { physicalFileNumber } = parseResult.data;

      // Check unique constraint for physical file number in this practice
      const taken = db.select()
        .from(patientPracticeMemberships)
        .where(and(
          eq(patientPracticeMemberships.practice, practice),
          eq(patientPracticeMemberships.physicalFileNumber, physicalFileNumber)
        ))
        .get();

      if (taken && taken.patientId !== id) {
        return reply.status(409).send({
          success: false,
          error: { code: 'DUPLICATE_FILE_NUMBER', message: `شماره پرونده فیزیکی ${physicalFileNumber} در این مطب متعلق به بیمار دیگری می‌باشد.` }
        });
      }

      const existingMem = db.select()
        .from(patientPracticeMemberships)
        .where(and(
          eq(patientPracticeMemberships.patientId, id),
          eq(patientPracticeMemberships.practice, practice)
        ))
        .get();

      const todayStr = toStandardJalaliDbDate(new Date().toLocaleDateString('fa-IR'));

      if (existingMem) {
        db.update(patientPracticeMemberships)
          .set({ physicalFileNumber })
          .where(and(
            eq(patientPracticeMemberships.patientId, id),
            eq(patientPracticeMemberships.practice, practice)
          ))
          .run();
      } else {
        db.insert(patientPracticeMemberships)
          .values({
            patientId: id,
            practice,
            physicalFileNumber,
            joinedAt: todayStr || '1405-01-01'
          })
          .run();
      }

      const patient = db.select().from(patients).where(eq(patients.id, id)).get();
      const updatedMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, id)).all();

      return reply.send({
        success: true,
        data: formatPatientData(patient!, updatedMems)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ویرایش شماره پرونده فیزیکی مطب' }
      });
    }
  });

  // POST /api/patients/merge
  fastify.post('/merge', async (request, reply) => {
    try {
      const parseResult = mergePatientsSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات ارسالی برای ادغام معتبر نیست' }
        });
      }

      const { patientAId, patientBId, primaryPatientId } = parseResult.data;

      // 1. Guard: Cannot merge a patient with itself
      if (patientAId === patientBId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_MERGE', message: 'امکان ادغام یک پرونده با خودش وجود ندارد.' }
        });
      }

      // 2. Guard: primaryPatientId must be one of the two patients
      if (primaryPatientId !== patientAId && primaryPatientId !== patientBId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PRIMARY_PATIENT', message: 'پرونده اصلی انتخاب‌شده باید یکی از دو پرونده مشخص‌شده باشد.' }
        });
      }

      const primaryId = primaryPatientId;
      const secondaryId = primaryPatientId === patientAId ? patientBId : patientAId;

      const primaryPatient = db.select().from(patients).where(eq(patients.id, primaryId)).get();
      const secondaryPatient = db.select().from(patients).where(eq(patients.id, secondaryId)).get();

      if (!primaryPatient || !secondaryPatient) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'یکی از دو پرونده انتخاب‌شده برای ادغام یافت نشد.' }
        });
      }

      const primaryMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, primaryId)).all();
      const secondaryMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, secondaryId)).all();

      // 3. Guard: Prevent merge if both patients have a membership in the same practice
      const overlapping = secondaryMems.filter(sm => primaryMems.some(pm => pm.practice === sm.practice));
      if (overlapping.length > 0) {
        const practiceNames = overlapping.map(m => m.practice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی').join(' و ');
        return reply.status(409).send({
          success: false,
          error: {
            code: 'PRACTICE_CONFLICT',
            message: `امکان ادغام مستقیم این دو پرونده وجود ندارد؛ هر دو بیمار دارای عضویت در ${practiceNames} هستند. برای ادغام، یک بیمار نباید در یک مطب دو پرونده همزمان داشته باشد.`
          }
        });
      }

      // 4. Atomic Database Transaction
      sqlite.transaction(() => {
        // A. Transfer Practice Memberships from secondary to primary
        for (const sm of secondaryMems) {
          const practicePhone = sm.phone || (secondaryPatient.mobile !== primaryPatient.mobile ? secondaryPatient.mobile : null);

          db.update(patientPracticeMemberships)
            .set({
              patientId: primaryId,
              phone: practicePhone
            })
            .where(and(
              eq(patientPracticeMemberships.patientId, secondaryId),
              eq(patientPracticeMemberships.practice, sm.practice)
            ))
            .run();
        }

        // B. Transfer Appointments
        db.update(appointments)
          .set({ patientId: primaryId })
          .where(eq(appointments.patientId, secondaryId))
          .run();

        // C. Transfer Financial Obligations
        db.update(financialObligations)
          .set({ patientId: primaryId })
          .where(eq(financialObligations.patientId, secondaryId))
          .run();

        // D. Transfer Payment Receipts
        db.update(paymentReceipts)
          .set({ patientId: primaryId })
          .where(eq(paymentReceipts.patientId, secondaryId))
          .run();

        // E. Transfer Follow-up Tasks
        db.update(followUpTasks)
          .set({ patientId: primaryId })
          .where(eq(followUpTasks.patientId, secondaryId))
          .run();

        // F. Transfer soft references in Excel Import Records
        db.update(excelImportRecords)
          .set({ duplicateTargetPatientId: primaryId })
          .where(eq(excelImportRecords.duplicateTargetPatientId, secondaryId))
          .run();

        db.update(excelImportRecords)
          .set({ importedPatientId: primaryId })
          .where(eq(excelImportRecords.importedPatientId, secondaryId))
          .run();

        // G. Merge Identity/Clinical Details from secondary if primary lacked them
        const updatesToPrimary: Partial<typeof primaryPatient> = {};

        if (!primaryPatient.nationalId && secondaryPatient.nationalId) {
          updatesToPrimary.nationalId = secondaryPatient.nationalId;
        }
        if (!primaryPatient.birthDate && secondaryPatient.birthDate) {
          updatesToPrimary.birthDate = secondaryPatient.birthDate;
        }
        if (!primaryPatient.gender && secondaryPatient.gender) {
          updatesToPrimary.gender = secondaryPatient.gender;
        }
        if (secondaryPatient.medicalNotes && secondaryPatient.medicalNotes.trim()) {
          if (primaryPatient.medicalNotes && primaryPatient.medicalNotes.trim()) {
            updatesToPrimary.medicalNotes = `${primaryPatient.medicalNotes}\n[سوابق ادغام‌شده]: ${secondaryPatient.medicalNotes}`;
          } else {
            updatesToPrimary.medicalNotes = secondaryPatient.medicalNotes;
          }
        }

        // Allergies
        let pAlg: string[] = [];
        let sAlg: string[] = [];
        try { if (primaryPatient.allergies) pAlg = JSON.parse(primaryPatient.allergies); } catch (_) {}
        try { if (secondaryPatient.allergies) sAlg = JSON.parse(secondaryPatient.allergies); } catch (_) {}
        const mergedAlg = Array.from(new Set([...pAlg, ...sAlg]));
        if (mergedAlg.length > 0) {
          updatesToPrimary.allergies = JSON.stringify(mergedAlg);
        }

        // Emergency contact
        if (!primaryPatient.emergencyContact && secondaryPatient.emergencyContact) {
          updatesToPrimary.emergencyContact = secondaryPatient.emergencyContact;
        }

        if (Object.keys(updatesToPrimary).length > 0) {
          db.update(patients)
            .set(updatesToPrimary)
            .where(eq(patients.id, primaryId))
            .run();
        }

        // H. Delete the secondary patient (all foreign keys have been moved)
        db.delete(patients)
          .where(eq(patients.id, secondaryId))
          .run();
      })();

      const updatedPrimary = db.select().from(patients).where(eq(patients.id, primaryId)).get();
      const updatedMems = db.select().from(patientPracticeMemberships).where(eq(patientPracticeMemberships.patientId, primaryId)).all();

      return reply.send({
        success: true,
        data: formatPatientData(updatedPrimary!, updatedMems)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در عملیات ادغام پرونده‌های بیمار' }
      });
    }
  });
}
