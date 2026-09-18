import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../config/database';
import { clinicSettings } from '../../db/schema/settings';
import { eq } from 'drizzle-orm';

const shiftConfigSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'فرمت ساعت باید HH:mm باشد'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'فرمت ساعت باید HH:mm باشد')
});

const shiftsUpdateSchema = z.object({
  morning: shiftConfigSchema,
  evening: shiftConfigSchema
}).refine(data => data.morning.endTime > data.morning.startTime, {
  message: 'ساعت پایان شیفت صبح باید بعد از ساعت شروع باشد',
  path: ['morning', 'endTime']
}).refine(data => data.evening.endTime > data.evening.startTime, {
  message: 'ساعت پایان شیفت عصر باید بعد از ساعت شروع باشد',
  path: ['evening', 'endTime']
}).refine(data => data.morning.endTime <= data.evening.startTime, {
  message: 'شیفت صبح و عصر نباید هم‌پوشانی داشته باشند',
  path: ['evening', 'startTime']
});

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'consumables', name: 'مواد مصرفی' },
  { id: 'rent', name: 'اجاره و رهن' },
  { id: 'salaries', name: 'حقوق پرسنل' },
  { id: 'equipment', name: 'تجهیزات و تعمیرات' },
  { id: 'utilities', name: 'قبوض و نگهداری' },
  { id: 'other', name: 'متفرقه' }
];

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'نام دسته‌بندی الزامی است')
});

const expenseCategoriesUpdateSchema = z.array(categorySchema);

export async function settingsRouter(fastify: FastifyInstance) {
  // GET /api/settings/shifts
  fastify.get('/shifts', async (request, reply) => {
    try {
      const setting = db.select().from(clinicSettings).where(eq(clinicSettings.key, 'global_shifts')).get();
      let shifts = {
        morning: { startTime: '09:00', endTime: '14:00' },
        evening: { startTime: '16:00', endTime: '21:00' }
      };

      if (setting && setting.value) {
        try {
          shifts = JSON.parse(setting.value);
        } catch (e) {
          console.error('Failed to parse global_shifts setting JSON:', e);
        }
      }

      return reply.send({
        success: true,
        data: shifts
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت تنظیمات شیفت‌ها' }
      });
    }
  });

  // PUT /api/settings/shifts
  fastify.put('/shifts', async (request, reply) => {
    try {
      const parseResult = shiftsUpdateSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات شیفت‌ها معتبر نیست' }
        });
      }

      const updatedShifts = parseResult.data;
      const jsonValue = JSON.stringify(updatedShifts);

      // Upsert into clinic_settings
      const existing = db.select().from(clinicSettings).where(eq(clinicSettings.key, 'global_shifts')).get();
      if (existing) {
        db.update(clinicSettings)
          .set({ value: jsonValue })
          .where(eq(clinicSettings.key, 'global_shifts'))
          .run();
      } else {
        db.insert(clinicSettings)
          .values({ key: 'global_shifts', value: jsonValue })
          .run();
      }

      return reply.send({
        success: true,
        data: updatedShifts
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در بروزرسانی شیفت‌ها' }
      });
    }
  });

  // GET /api/settings/expense-categories
  fastify.get('/expense-categories', async (request, reply) => {
    try {
      const setting = db.select().from(clinicSettings).where(eq(clinicSettings.key, 'expense_categories')).get();
      let categories = DEFAULT_EXPENSE_CATEGORIES;

      if (setting && setting.value) {
        try {
          categories = JSON.parse(setting.value);
        } catch (e) {
          console.error('Failed to parse expense_categories setting JSON:', e);
        }
      }

      return reply.send({
        success: true,
        data: categories
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت دسته‌بندی‌های هزینه' }
      });
    }
  });

  // PUT /api/settings/expense-categories
  fastify.put('/expense-categories', async (request, reply) => {
    try {
      const parseResult = expenseCategoriesUpdateSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات دسته‌بندی‌ها معتبر نیست' }
        });
      }

      const updatedCategories = parseResult.data;
      const jsonValue = JSON.stringify(updatedCategories);

      const existing = db.select().from(clinicSettings).where(eq(clinicSettings.key, 'expense_categories')).get();
      if (existing) {
        db.update(clinicSettings)
          .set({ value: jsonValue })
          .where(eq(clinicSettings.key, 'expense_categories'))
          .run();
      } else {
        db.insert(clinicSettings)
          .values({ key: 'expense_categories', value: jsonValue })
          .run();
      }

      return reply.send({
        success: true,
        data: updatedCategories
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در بروزرسانی دسته‌بندی‌های هزینه' }
      });
    }
  });
}
