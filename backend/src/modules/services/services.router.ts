import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../config/database';
import { services } from '../../db/schema/services';
import { eq } from 'drizzle-orm';

const createServiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'نام خدمت الزامی است'),
  code: z.string().min(1, 'کد خدمت الزامی است'),
  practice: z.enum(['aesthetic', 'dental']),
  price: z.number().int().min(0, 'قیمت نباید منفی باشد'),
  duration: z.number().int().positive('مدت زمان باید عدد مثبت باشد'),
  description: z.string().optional().nullable(),
  defaultPaymentTermDays: z.number().int().min(0).optional().nullable(),
  active: z.boolean().optional().default(true)
});

const updateServiceSchema = createServiceSchema.partial();

export async function servicesRouter(fastify: FastifyInstance) {
  // GET /api/services
  fastify.get('/', async (request, reply) => {
    try {
      const { practice, active } = request.query as { practice?: string; active?: string };

      let list = db.select().from(services).all();

      if (practice && (practice === 'aesthetic' || practice === 'dental')) {
        list = list.filter((s: { practice: string }) => s.practice === practice);
      }

      if (active !== undefined && active !== null && active !== '') {
        const isActiveBool = active === 'true' || active === '1';
        list = list.filter((s: { active: boolean | number }) => Boolean(s.active) === isActiveBool);
      }

      const formatted = list.map((s: { id: string; name: string; code: string; practice: string; price: number; duration: number; description: string | null; defaultPaymentTermDays: number | null; active: boolean | number }) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        practice: s.practice as 'aesthetic' | 'dental',
        price: s.price,
        duration: s.duration,
        description: s.description || undefined,
        defaultPaymentTermDays: s.defaultPaymentTermDays !== null ? s.defaultPaymentTermDays : undefined,
        active: Boolean(s.active)
      }));

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت لیست خدمات' }
      });
    }
  });

  // POST /api/services
  fastify.post('/', async (request, reply) => {
    try {
      const parseResult = createServiceSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات خدمت معتبر نیست' }
        });
      }

      const body = parseResult.data;

      // Check unique code
      const existingCode = db.select().from(services).where(eq(services.code, body.code)).get();
      if (existingCode) {
        return reply.status(400).send({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: 'کد خدمت وارد شده قبلاً ثبت شده است' }
        });
      }

      const newId = body.id || `srv-${Date.now()}`;
      const defaultDays = body.defaultPaymentTermDays !== undefined && body.defaultPaymentTermDays !== null ? body.defaultPaymentTermDays : 10;

      db.insert(services)
        .values({
          id: newId,
          name: body.name,
          code: body.code,
          practice: body.practice,
          price: body.price,
          duration: body.duration,
          description: body.description || null,
          defaultPaymentTermDays: defaultDays,
          active: body.active ?? true
        })
        .run();

      const created = db.select().from(services).where(eq(services.id, newId)).get();

      return reply.status(201).send({
        success: true,
        data: {
          id: created!.id,
          name: created!.name,
          code: created!.code,
          practice: created!.practice as 'aesthetic' | 'dental',
          price: created!.price,
          duration: created!.duration,
          description: created!.description || undefined,
          defaultPaymentTermDays: created!.defaultPaymentTermDays !== null ? created!.defaultPaymentTermDays : undefined,
          active: Boolean(created!.active)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ایجاد خدمت جدید' }
      });
    }
  });

  // PATCH /api/services/:id
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = db.select().from(services).where(eq(services.id, id)).get();
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'خدمت مورد نظر یافت نشد' }
        });
      }

      const parseResult = updateServiceSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات خدمت معتبر نیست' }
        });
      }

      const body = parseResult.data;

      // Check code uniqueness if changing code
      if (body.code && body.code !== existing.code) {
        const checkCode = db.select().from(services).where(eq(services.code, body.code)).get();
        if (checkCode) {
          return reply.status(400).send({
            success: false,
            error: { code: 'DUPLICATE_CODE', message: 'کد خدمت وارد شده قبلاً استفاده شده است' }
          });
        }
      }

      const updatedValues: Partial<typeof existing> = {};
      if (body.name !== undefined) updatedValues.name = body.name;
      if (body.code !== undefined) updatedValues.code = body.code;
      if (body.practice !== undefined) updatedValues.practice = body.practice;
      if (body.price !== undefined) updatedValues.price = body.price;
      if (body.duration !== undefined) updatedValues.duration = body.duration;
      if (body.description !== undefined) updatedValues.description = body.description || null;
      if (body.defaultPaymentTermDays !== undefined) updatedValues.defaultPaymentTermDays = body.defaultPaymentTermDays !== null ? body.defaultPaymentTermDays : 10;
      if (body.active !== undefined) updatedValues.active = body.active;

      db.update(services)
        .set(updatedValues)
        .where(eq(services.id, id))
        .run();

      const updated = db.select().from(services).where(eq(services.id, id)).get();

      return reply.send({
        success: true,
        data: {
          id: updated!.id,
          name: updated!.name,
          code: updated!.code,
          practice: updated!.practice as 'aesthetic' | 'dental',
          price: updated!.price,
          duration: updated!.duration,
          description: updated!.description || undefined,
          defaultPaymentTermDays: updated!.defaultPaymentTermDays !== null ? updated!.defaultPaymentTermDays : undefined,
          active: Boolean(updated!.active)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ویرایش خدمت' }
      });
    }
  });
}
