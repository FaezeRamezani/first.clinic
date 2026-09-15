import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../config/database';
import { paymentAccounts } from '../../db/schema/paymentAccounts';
import { eq } from 'drizzle-orm';

const createAccountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'نام حساب الزامی است'),
  practice: z.enum(['aesthetic', 'dental'])
});

const updateAccountSchema = createAccountSchema.partial();

export async function paymentAccountsRouter(fastify: FastifyInstance) {
  // GET /api/payment-accounts
  fastify.get('/', async (request, reply) => {
    try {
      const { practice } = request.query as { practice?: string };
      let list = db.select().from(paymentAccounts).all();

      if (practice && (practice === 'aesthetic' || practice === 'dental')) {
        list = list.filter((a: { practice: string }) => a.practice === practice);
      }

      const formatted = list.map((a: { id: string; name: string; practice: string }) => ({
        id: a.id,
        name: a.name,
        practice: a.practice as 'aesthetic' | 'dental'
      }));

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت لیست حساب‌ها' }
      });
    }
  });

  // POST /api/payment-accounts
  fastify.post('/', async (request, reply) => {
    try {
      const parseResult = createAccountSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات حساب معتبر نیست' }
        });
      }

      const body = parseResult.data;
      const newId = body.id || `acc-${Date.now()}`;

      db.insert(paymentAccounts)
        .values({
          id: newId,
          name: body.name.trim(),
          practice: body.practice
        })
        .run();

      const created = db.select().from(paymentAccounts).where(eq(paymentAccounts.id, newId)).get();

      return reply.status(201).send({
        success: true,
        data: {
          id: created!.id,
          name: created!.name,
          practice: created!.practice as 'aesthetic' | 'dental'
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در افزودن حساب جدید' }
      });
    }
  });

  // PATCH /api/payment-accounts/:id
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id)).get();

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'حساب مورد نظر یافت نشد' }
        });
      }

      const parseResult = updateAccountSchema.safeParse(request.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: issue?.message || 'اطلاعات حساب معتبر نیست' }
        });
      }

      const body = parseResult.data;
      const updatedValues: Partial<typeof existing> = {};
      if (body.name !== undefined) updatedValues.name = body.name.trim();
      if (body.practice !== undefined) updatedValues.practice = body.practice;

      db.update(paymentAccounts)
        .set(updatedValues)
        .where(eq(paymentAccounts.id, id))
        .run();

      const updated = db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id)).get();

      return reply.send({
        success: true,
        data: {
          id: updated!.id,
          name: updated!.name,
          practice: updated!.practice as 'aesthetic' | 'dental'
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در ویرایش حساب' }
      });
    }
  });
}
