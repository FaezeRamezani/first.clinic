import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, sqlite } from '../../config/database';
import { appointments } from '../../db/schema/appointments';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { doctors } from '../../db/schema/doctors';
import { services } from '../../db/schema/services';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { toStandardJalaliDbDate, toEnglishDigits } from '../../utils/dateUtils';

const appointmentStatusEnum = z.enum(['pending', 'checked_in', 'completed', 'canceled', 'rescheduled', 'unsettled']);
const presenceStatusEnum = z.enum(['present', 'absent', 'pending']);
const cancellationTypeEnum = z.enum(['rescheduled', 'no_replacement']);

const createAppointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, 'شناسه بیمار الزامی است'),
  doctorId: z.string().min(1, 'شناسه پزشک الزامی است'),
  serviceId: z.string().optional().nullable(),
  practice: z.enum(['aesthetic', 'dental']),
  date: z.string().min(1, 'تاریخ نوبت الزامی است'),
  timeSlot: z.string().min(1, 'ساعت نوبت الزامی است'),
  duration: z.number().optional().default(30),
  status: appointmentStatusEnum.optional().default('pending'),
  presenceStatus: presenceStatusEnum.optional().nullable(),
  notes: z.string().optional().nullable(),
  cabinetNumber: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancellationType: cancellationTypeEnum.optional().nullable(),
  canceledAt: z.string().optional().nullable(),
  previousAppointmentId: z.string().optional().nullable(),
  replacementAppointmentId: z.string().optional().nullable()
});

const updateAppointmentSchema = createAppointmentSchema.partial();

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

function formatAppointmentData(
  apt: typeof appointments.$inferSelect,
  patientMap: Map<string, typeof patients.$inferSelect>,
  doctorMap: Map<string, typeof doctors.$inferSelect>,
  serviceMap: Map<string, typeof services.$inferSelect>,
  membershipMap: Map<string, string>
) {
  const patient = patientMap.get(apt.patientId);
  const doctor = doctorMap.get(apt.doctorId);
  const service = apt.serviceId ? serviceMap.get(apt.serviceId) : undefined;
  
  // Key for membership: `${patientId}_${practice}`
  const memKey = `${apt.patientId}_${apt.practice}`;
  const fileNum = membershipMap.get(memKey) || patient?.fileNumber || '-';

  return {
    id: apt.id,
    patientId: apt.patientId,
    patientName: patient?.name || 'بیمار نامشخص',
    patientMobile: patient?.mobile || '',
    fileNumber: fileNum,
    doctorId: apt.doctorId,
    doctorName: doctor?.name || 'پزشک نامشخص',
    practice: apt.practice as 'aesthetic' | 'dental',
    date: apt.date,
    timeSlot: apt.timeSlot,
    duration: apt.duration,
    status: apt.status as any,
    presenceStatus: apt.presenceStatus as any || undefined,
    notes: apt.notes || undefined,
    serviceId: apt.serviceId || undefined,
    serviceName: service?.name || undefined,
    cabinetNumber: apt.cabinetNumber || undefined,
    cancellationReason: apt.cancellationReason || undefined,
    cancellationType: apt.cancellationType as any || undefined,
    canceledAt: apt.canceledAt || undefined,
    previousAppointmentId: apt.previousAppointmentId || undefined,
    replacementAppointmentId: apt.replacementAppointmentId || undefined
  };
}

export async function appointmentsRouter(fastify: FastifyInstance) {
  // GET /api/appointments
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        date?: string;
        practice?: string;
        doctorId?: string;
        patientId?: string;
        status?: string;
      };

      let allApts = db.select().from(appointments).all();

      // Apply Filters
      if (query.date) {
        const stdDate = toStandardJalaliDbDate(query.date);
        allApts = allApts.filter(a => a.date === stdDate || toStandardJalaliDbDate(a.date) === stdDate);
      }
      if (query.practice && query.practice !== 'unified') {
        allApts = allApts.filter(a => a.practice === query.practice);
      }
      if (query.doctorId) {
        allApts = allApts.filter(a => a.doctorId === query.doctorId);
      }
      if (query.patientId) {
        allApts = allApts.filter(a => a.patientId === query.patientId);
      }
      if (query.status) {
        allApts = allApts.filter(a => a.status === query.status);
      }

      // Sort by date ASC, then timeSlot ASC
      allApts.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const slotA = toEnglishDigits(a.timeSlot);
        const slotB = toEnglishDigits(b.timeSlot);
        return slotA.localeCompare(slotB);
      });

      // Build maps for fast lookups
      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allServices = db.select().from(services).all();
      const serviceMap = new Map(allServices.map(s => [s.id, s]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = allApts.map(apt => formatAppointmentData(apt, patientMap, doctorMap, serviceMap, membershipMap));

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت لیست نوبت‌ها'
      });
    }
  });

  // GET /api/appointments/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const apt = db.select().from(appointments).where(eq(appointments.id, id)).get();

      if (!apt) {
        return reply.status(404).send({
          success: false,
          error: 'نوبت مورد نظر یافت نشد'
        });
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allServices = db.select().from(services).all();
      const serviceMap = new Map(allServices.map(s => [s.id, s]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = formatAppointmentData(apt, patientMap, doctorMap, serviceMap, membershipMap);

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت اطلاعات نوبت'
      });
    }
  });

  // POST /api/appointments
  fastify.post('/', async (request, reply) => {
    try {
      const result = createAppointmentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات نوبت کامل یا معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const stdDate = toStandardJalaliDbDate(data.date);
      const stdTimeSlot = toEnglishDigits(data.timeSlot).trim();

      // Verify Patient exists
      const patient = db.select().from(patients).where(eq(patients.id, data.patientId)).get();
      if (!patient) {
        return reply.status(400).send({
          success: false,
          error: 'بیمار انتخاب‌شده یافت نشد.'
        });
      }

      // Verify Doctor exists
      const doctor = db.select().from(doctors).where(eq(doctors.id, data.doctorId)).get();
      if (!doctor) {
        return reply.status(400).send({
          success: false,
          error: 'پزشک انتخاب‌شده یافت نشد.'
        });
      }

      // Transaction for safe conflict check & creation
      let createdAptId = data.id || `apt-${Date.now()}`;

      try {
        sqlite.transaction(() => {
          // Conflict Check: Active appointments for same doctor, date, and timeSlot
          const existing = db.select().from(appointments).all();
          const hasConflict = existing.some(a => {
            if (a.status === 'canceled' || a.status === 'rescheduled') return false;
            if (a.doctorId !== data.doctorId) return false;
            const aDate = toStandardJalaliDbDate(a.date);
            const aSlot = toEnglishDigits(a.timeSlot).trim();
            return aDate === stdDate && aSlot === stdTimeSlot;
          });

          if (hasConflict) {
            throw new Error('CONFLICT:این زمان برای پزشک انتخاب‌شده قبلاً رزرو شده است.');
          }

          // Ensure practice membership exists
          const mem = db.select().from(patientPracticeMemberships)
            .where(and(
              eq(patientPracticeMemberships.patientId, data.patientId),
              eq(patientPracticeMemberships.practice, data.practice)
            )).get();

          if (!mem) {
            const nextFileNum = getNextPhysicalFileNumber(data.practice);
            db.insert(patientPracticeMemberships).values({
              patientId: data.patientId,
              practice: data.practice,
              physicalFileNumber: nextFileNum,
              joinedAt: stdDate
            }).run();
          }

          // Insert appointment
          db.insert(appointments).values({
            id: createdAptId,
            patientId: data.patientId,
            doctorId: data.doctorId,
            serviceId: data.serviceId || null,
            practice: data.practice,
            date: stdDate,
            timeSlot: stdTimeSlot,
            duration: data.duration,
            status: data.status,
            presenceStatus: data.presenceStatus || null,
            notes: data.notes || null,
            cabinetNumber: data.cabinetNumber || null,
            cancellationReason: data.cancellationReason || null,
            cancellationType: data.cancellationType || null,
            canceledAt: data.canceledAt ? toStandardJalaliDbDate(data.canceledAt) : null,
            previousAppointmentId: data.previousAppointmentId || null,
            replacementAppointmentId: data.replacementAppointmentId || null
          }).run();

          // Link previous appointment if rescheduling
          if (data.previousAppointmentId) {
            db.update(appointments)
              .set({
                status: 'rescheduled',
                cancellationType: 'rescheduled',
                cancellationReason: 'تغییر نوبت و تعیین زمان جدید',
                canceledAt: stdDate,
                replacementAppointmentId: createdAptId
              })
              .where(eq(appointments.id, data.previousAppointmentId))
              .run();
          }
        })();
      } catch (txnErr: any) {
        if (txnErr.message?.startsWith('CONFLICT:')) {
          return reply.status(409).send({
            success: false,
            error: txnErr.message.replace('CONFLICT:', '')
          });
        }
        throw txnErr;
      }

      // Fetch formatted created appointment
      const newApt = db.select().from(appointments).where(eq(appointments.id, createdAptId)).get();
      if (!newApt) {
        throw new Error('Failed to retrieve inserted appointment');
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allServices = db.select().from(services).all();
      const serviceMap = new Map(allServices.map(s => [s.id, s]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = formatAppointmentData(newApt, patientMap, doctorMap, serviceMap, membershipMap);

      return reply.status(201).send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت نوبت جدید'
      });
    }
  });

  // PATCH /api/appointments/:id
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const targetApt = db.select().from(appointments).where(eq(appointments.id, id)).get();

      if (!targetApt) {
        return reply.status(404).send({
          success: false,
          error: 'نوبت مورد نظر یافت نشد'
        });
      }

      const result = updateAppointmentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات نوبت معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const newDocId = data.doctorId || targetApt.doctorId;
      const newDate = data.date ? toStandardJalaliDbDate(data.date) : targetApt.date;
      const newTimeSlot = data.timeSlot ? toEnglishDigits(data.timeSlot).trim() : targetApt.timeSlot;

      // Check conflict if doctor, date, or timeSlot changed
      const isScheduleChanged = data.doctorId || data.date || data.timeSlot;
      if (isScheduleChanged) {
        const existing = db.select().from(appointments).all();
        const hasConflict = existing.some(a => {
          if (a.id === id) return false;
          if (a.status === 'canceled' || a.status === 'rescheduled') return false;
          if (a.doctorId !== newDocId) return false;
          const aDate = toStandardJalaliDbDate(a.date);
          const aSlot = toEnglishDigits(a.timeSlot).trim();
          return aDate === newDate && aSlot === newTimeSlot;
        });

        if (hasConflict) {
          return reply.status(409).send({
            success: false,
            error: 'این زمان برای پزشک انتخاب‌شده قبلاً رزرو شده است.'
          });
        }
      }

      // Update fields
      const updatedFields: Partial<typeof appointments.$inferSelect> = {};
      if (data.patientId !== undefined) updatedFields.patientId = data.patientId;
      if (data.doctorId !== undefined) updatedFields.doctorId = data.doctorId;
      if (data.serviceId !== undefined) updatedFields.serviceId = data.serviceId || null;
      if (data.practice !== undefined) updatedFields.practice = data.practice;
      if (data.date !== undefined) updatedFields.date = toStandardJalaliDbDate(data.date);
      if (data.timeSlot !== undefined) updatedFields.timeSlot = toEnglishDigits(data.timeSlot).trim();
      if (data.duration !== undefined) updatedFields.duration = data.duration;
      if (data.status !== undefined) updatedFields.status = data.status;
      if (data.presenceStatus !== undefined) updatedFields.presenceStatus = data.presenceStatus || null;
      if (data.notes !== undefined) updatedFields.notes = data.notes || null;
      if (data.cabinetNumber !== undefined) updatedFields.cabinetNumber = data.cabinetNumber || null;
      if (data.cancellationReason !== undefined) updatedFields.cancellationReason = data.cancellationReason || null;
      if (data.cancellationType !== undefined) updatedFields.cancellationType = data.cancellationType || null;
      if (data.canceledAt !== undefined) updatedFields.canceledAt = data.canceledAt ? toStandardJalaliDbDate(data.canceledAt) : null;
      if (data.previousAppointmentId !== undefined) updatedFields.previousAppointmentId = data.previousAppointmentId || null;
      if (data.replacementAppointmentId !== undefined) updatedFields.replacementAppointmentId = data.replacementAppointmentId || null;

      db.update(appointments).set(updatedFields).where(eq(appointments.id, id)).run();

      const updatedApt = db.select().from(appointments).where(eq(appointments.id, id)).get();
      if (!updatedApt) {
        throw new Error('Failed to retrieve updated appointment');
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allServices = db.select().from(services).all();
      const serviceMap = new Map(allServices.map(s => [s.id, s]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = formatAppointmentData(updatedApt, patientMap, doctorMap, serviceMap, membershipMap);

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ویرایش نوبت'
      });
    }
  });
}
