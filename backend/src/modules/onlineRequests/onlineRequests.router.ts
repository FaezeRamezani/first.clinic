import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, sqlite } from '../../config/database';
import { onlineRequests } from '../../db/schema/onlineRequests';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { doctors } from '../../db/schema/doctors';
import { appointments } from '../../db/schema/appointments';
import { eq, and } from 'drizzle-orm';
import { toStandardJalaliDbDate, toEnglishDigits } from '../../utils/dateUtils';
import moment from 'jalali-moment';

function getTodayJalaliStr(): string {
  return moment().locale('fa').format('YYYY-MM-DD');
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

const approveRequestSchema = z.object({
  confirmedDate: z.string().optional(),
  timeSlot: z.string().optional(),
  doctorId: z.string().optional(),
  customMessage: z.string().optional()
});

const rejectRequestSchema = z.object({
  rejectionReason: z.string().min(1, 'علت رد درخواست الزامی است')
});

function formatOnlineRequestData(
  reqItem: typeof onlineRequests.$inferSelect,
  doctorMap: Map<string, typeof doctors.$inferSelect>
) {
  const doctor = doctorMap.get(reqItem.doctorId);
  let proposedDatesArr: string[] = [];
  if (reqItem.proposedDates) {
    try {
      proposedDatesArr = JSON.parse(reqItem.proposedDates);
    } catch {
      proposedDatesArr = [];
    }
  }

  return {
    id: reqItem.id,
    patientName: reqItem.patientName,
    mobile: reqItem.mobile,
    nationalId: reqItem.nationalId || undefined,
    targetPractice: reqItem.targetPractice as 'aesthetic' | 'dental',
    doctorId: reqItem.doctorId,
    doctorName: doctor?.name || 'پزشک نامشخص',
    requestedDate: reqItem.requestedDate,
    requestedTimeSlot: reqItem.requestedTimeSlot,
    requestType: (reqItem.requestType as any) || 'visit',
    proposedDates: proposedDatesArr,
    notes: reqItem.notes || undefined,
    status: reqItem.status as any,
    rejectionReason: reqItem.rejectionReason || undefined,
    rejectedAt: reqItem.rejectedAt || undefined,
    createdAt: reqItem.createdAt,
    appointmentId: reqItem.appointmentId || undefined
  };
}

export async function onlineRequestsRouter(fastify: FastifyInstance) {
  // GET /api/online-requests
  fastify.get('/', async (request, reply) => {
    try {
      const { practice, status } = request.query as { practice?: string; status?: string };
      let requests = db.select().from(onlineRequests).all();

      if (practice && practice !== 'unified') {
        requests = requests.filter(r => r.targetPractice === practice);
      }
      if (status && status !== 'all') {
        requests = requests.filter(r => r.status === status);
      }

      requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const formatted = requests.map(r => formatOnlineRequestData(r, doctorMap));

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت لیست درخواست‌های آنلاین'
      });
    }
  });

  // GET /api/online-requests/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const reqItem = db.select().from(onlineRequests).where(eq(onlineRequests.id, id)).get();

      if (!reqItem) {
        return reply.status(404).send({
          success: false,
          error: 'درخواست آنلاین مورد نظر یافت نشد'
        });
      }

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const formatted = formatOnlineRequestData(reqItem, doctorMap);

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت درخواست آنلاین'
      });
    }
  });

  // POST /api/online-requests/:id/approve (Atomic Approval & Appointment Creation)
  fastify.post('/:id/approve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const reqItem = db.select().from(onlineRequests).where(eq(onlineRequests.id, id)).get();

      if (!reqItem) {
        return reply.status(404).send({
          success: false,
          error: 'درخواست آنلاین مورد نظر یافت نشد'
        });
      }

      // Check if already approved or rejected
      if (reqItem.status !== 'pending') {
        return reply.status(400).send({
          success: false,
          error: 'این درخواست قبلاً تعیین تکلیف شده است.'
        });
      }

      const parseResult = approveRequestSchema.safeParse(request.body || {});
      const data = parseResult.success ? parseResult.data : {};

      const targetDoctorId = data.doctorId || reqItem.doctorId;
      const targetDate = data.confirmedDate ? toStandardJalaliDbDate(data.confirmedDate) : reqItem.requestedDate;
      const targetSlot = data.timeSlot ? toEnglishDigits(data.timeSlot).trim() : reqItem.requestedTimeSlot;
      const targetPractice = reqItem.targetPractice as 'aesthetic' | 'dental';

      let createdAptId = `apt-online-${Date.now()}`;
      let patientId = '';

      try {
        sqlite.transaction(() => {
          // 1. Conflict Check: Active appointments for same doctor, date, and slot
          const existingApts = db.select().from(appointments).all();
          const hasConflict = existingApts.some(a => {
            if (a.status === 'canceled' || a.status === 'rescheduled') return false;
            if (a.doctorId !== targetDoctorId) return false;
            const aDate = toStandardJalaliDbDate(a.date);
            const aSlot = toEnglishDigits(a.timeSlot).trim();
            return aDate === targetDate && aSlot === targetSlot;
          });

          if (hasConflict) {
            throw new Error('CONFLICT:این زمان برای پزشک انتخاب‌شده قبلاً رزرو شده است.');
          }

          // 2. Find or Create Patient
          let pt = db.select().from(patients).where(eq(patients.mobile, reqItem.mobile)).get();
          if (!pt) {
            const newPatId = `pat-${Date.now()}`;
            const fileNum = getNextPhysicalFileNumber(targetPractice);

            db.insert(patients).values({
              id: newPatId,
              fileNumber: `CL-${fileNum}`,
              nationalId: reqItem.nationalId || null,
              name: reqItem.patientName,
              mobile: reqItem.mobile,
              gender: 'female',
              primaryPractice: targetPractice,
              profileStatus: 'completed',
              createdAt: getTodayJalaliStr()
            }).run();

            db.insert(patientPracticeMemberships).values({
              patientId: newPatId,
              practice: targetPractice,
              physicalFileNumber: fileNum,
              joinedAt: getTodayJalaliStr()
            }).run();

            patientId = newPatId;
          } else {
            patientId = pt.id;
            // Ensure practice membership
            const mem = db.select().from(patientPracticeMemberships)
              .where(and(
                eq(patientPracticeMemberships.patientId, pt.id),
                eq(patientPracticeMemberships.practice, targetPractice)
              )).get();

            if (!mem) {
              const fileNum = getNextPhysicalFileNumber(targetPractice);
              db.insert(patientPracticeMemberships).values({
                patientId: pt.id,
                practice: targetPractice,
                physicalFileNumber: fileNum,
                joinedAt: getTodayJalaliStr()
              }).run();
            }
          }

          // 3. Create Appointment
          db.insert(appointments).values({
            id: createdAptId,
            patientId: patientId,
            doctorId: targetDoctorId,
            practice: targetPractice,
            date: targetDate,
            timeSlot: targetSlot,
            duration: 30,
            status: 'pending',
            notes: data.customMessage || `نوبت تأییدشده از پورتال آنلاین: ${reqItem.notes || ''}`
          }).run();

          // 4. Update Online Request
          db.update(onlineRequests).set({
            status: 'approved',
            appointmentId: createdAptId
          }).where(eq(onlineRequests.id, id)).run();
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

      const updatedReq = db.select().from(onlineRequests).where(eq(onlineRequests.id, id)).get();
      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const formatted = formatOnlineRequestData(updatedReq!, doctorMap);

      return reply.send({
        success: true,
        data: {
          request: formatted,
          appointmentId: createdAptId
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در تأیید درخواست آنلاین'
      });
    }
  });

  // PATCH /api/online-requests/:id (Reject / Update)
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const reqItem = db.select().from(onlineRequests).where(eq(onlineRequests.id, id)).get();

      if (!reqItem) {
        return reply.status(404).send({
          success: false,
          error: 'درخواست آنلاین مورد نظر یافت نشد'
        });
      }

      const body = request.body as any;
      const todayStr = getTodayJalaliStr();

      if (body.status === 'rejected') {
        const parseResult = rejectRequestSchema.safeParse(body);
        const rejectionReason = parseResult.success ? parseResult.data.rejectionReason : (body.rejectionReason || 'تکمیل ظرفیت نوبت‌های پزشک در تاریخ درخواستی');

        db.update(onlineRequests).set({
          status: 'rejected',
          rejectionReason: rejectionReason,
          rejectedAt: todayStr
        }).where(eq(onlineRequests.id, id)).run();
      }

      const updatedReq = db.select().from(onlineRequests).where(eq(onlineRequests.id, id)).get();
      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const formatted = formatOnlineRequestData(updatedReq!, doctorMap);

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در به روزرسانی درخواست آنلاین'
      });
    }
  });
}
