import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, sqlite } from '../../config/database';
import { doctors, doctorSchedules } from '../../db/schema/doctors';
import { eq } from 'drizzle-orm';

const ALL_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const dayScheduleSchema = z.object({
  day: z.string(),
  morningActive: z.boolean(),
  eveningActive: z.boolean()
});

const putScheduleSchema = z.union([
  z.array(dayScheduleSchema),
  z.record(z.string(), z.object({
    morningActive: z.boolean(),
    eveningActive: z.boolean()
  }))
]);

export async function doctorsRouter(fastify: FastifyInstance) {
  // GET /api/doctors
  fastify.get('/', async (request, reply) => {
    try {
      const { practice } = request.query as { practice?: string };
      
      let allDocs = db.select().from(doctors).all();
      if (practice && (practice === 'aesthetic' || practice === 'dental')) {
        allDocs = allDocs.filter((d: { practice: string }) => d.practice === practice);
      }

      const allSchedules = db.select().from(doctorSchedules).all();

      const result = allDocs.map((doc: { id: string; name: string; specialty: string; practice: string; phone: string; avatar: string | null; workingHours: string | null; color: string }) => {
        const docScheds = allSchedules.filter((s: { doctorId: string }) => s.doctorId === doc.id);
        const weeklySchedule = ALL_DAYS.map(dayName => {
          const found = docScheds.find((s: { day: string }) => s.day === dayName);
          if (found) {
            return {
              day: dayName,
              morningActive: Boolean(found.morningActive),
              eveningActive: Boolean(found.eveningActive)
            };
          }
          const isOff = dayName === 'جمعه' || (doc.practice === 'aesthetic' && dayName === 'پنج‌شنبه');
          return {
            day: dayName,
            morningActive: !isOff,
            eveningActive: !isOff
          };
        });

        return {
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty,
          practice: doc.practice as 'aesthetic' | 'dental',
          phone: doc.phone,
          avatar: doc.avatar || '',
          workingHours: doc.workingHours || '',
          color: doc.color,
          weeklySchedule
        };
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت لیست پزشکان' }
      });
    }
  });

  // GET /api/doctors/:id/schedule
  fastify.get('/:id/schedule', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = db.select().from(doctors).where(eq(doctors.id, id)).get();
      if (!doc) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'پزشک مورد نظر یافت نشد' }
        });
      }

      const docScheds = db.select().from(doctorSchedules).where(eq(doctorSchedules.doctorId, id)).all();
      const weeklySchedule = ALL_DAYS.map(dayName => {
        const found = docScheds.find((s: { day: string }) => s.day === dayName);
        if (found) {
          return {
            day: dayName,
            morningActive: Boolean(found.morningActive),
            eveningActive: Boolean(found.eveningActive)
          };
        }
        const isOff = dayName === 'جمعه' || (doc.practice === 'aesthetic' && dayName === 'پنج‌شنبه');
        return {
          day: dayName,
          morningActive: !isOff,
          eveningActive: !isOff
        };
      });

      return reply.send({
        success: true,
        data: weeklySchedule
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت برنامه پزشک' }
      });
    }
  });

  // PUT /api/doctors/:id/schedule
  fastify.put('/:id/schedule', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = db.select().from(doctors).where(eq(doctors.id, id)).get();
      if (!doc) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'پزشک مورد نظر یافت نشد' }
        });
      }

      const parseResult = putScheduleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'ساختار برنامه هفتگی معتبر نیست' }
        });
      }

      let scheduleArray: { day: string; morningActive: boolean; eveningActive: boolean }[] = [];
      const body = parseResult.data;

      if (Array.isArray(body)) {
        scheduleArray = body;
      } else {
        scheduleArray = Object.entries(body).map(([day, val]) => ({
          day,
          morningActive: val.morningActive,
          eveningActive: val.eveningActive
        }));
      }

      // Execute transaction to update schedule
      sqlite.transaction(() => {
        // Delete existing schedule for doctor
        db.delete(doctorSchedules).where(eq(doctorSchedules.doctorId, id)).run();

        // Insert new schedule records
        for (const item of scheduleArray) {
          db.insert(doctorSchedules)
            .values({
              doctorId: id,
              day: item.day,
              morningActive: item.morningActive,
              eveningActive: item.eveningActive
            })
            .run();
        }
      })();

      return reply.send({
        success: true,
        data: scheduleArray
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در بروزرسانی برنامه کاری پزشک' }
      });
    }
  });
}
