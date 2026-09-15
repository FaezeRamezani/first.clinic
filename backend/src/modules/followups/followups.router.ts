import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../config/database';
import { followUpTasks } from '../../db/schema/followups';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { doctors } from '../../db/schema/doctors';
import { appointments } from '../../db/schema/appointments';
import { financialObligations, paymentReceipts } from '../../db/schema/finance';
import { eq, and } from 'drizzle-orm';
import { toStandardJalaliDbDate, toEnglishDigits } from '../../utils/dateUtils';
import moment from 'jalali-moment';

function getTodayJalaliStr(): string {
  return moment().locale('fa').format('YYYY-MM-DD');
}

function getTomorrowJalaliStr(): string {
  return moment().locale('fa').add(1, 'days').format('YYYY-MM-DD');
}

const taskTypeEnum = z.enum(['post_op', 'lab_result', 'checkup', 'debt_reminder', 'manual', 'operational']);
const taskStatusEnum = z.enum(['pending', 'called_no_answer', 'called_confirmed', 'rescheduled', 'completed']);

const createTaskSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  practice: z.enum(['aesthetic', 'dental', 'unified']).optional().default('aesthetic'),
  type: taskTypeEnum.optional().default('manual'),
  title: z.string().optional().nullable(),
  description: z.string().min(1, 'توضیحات یادآوری الزامی است'),
  dueDate: z.string().min(1, 'تاریخ سررسید الزامی است'),
  status: taskStatusEnum.optional().default('pending'),
  resultNote: z.string().optional().nullable()
});

const updateTaskSchema = createTaskSchema.partial();

function formatTaskData(
  task: typeof followUpTasks.$inferSelect,
  patientMap: Map<string, typeof patients.$inferSelect>,
  doctorMap: Map<string, typeof doctors.$inferSelect>,
  membershipMap: Map<string, string>
) {
  const patient = task.patientId ? patientMap.get(task.patientId) : undefined;
  const doctor = task.doctorId ? doctorMap.get(task.doctorId) : undefined;
  const fileNum = (task.patientId && task.practice !== 'unified')
    ? (membershipMap.get(`${task.patientId}_${task.practice}`) || patient?.fileNumber || '-')
    : (patient?.fileNumber || '-');

  return {
    id: task.id,
    patientId: task.patientId || '',
    patientName: patient?.name || (task.patientId ? 'بیمار نامشخص' : '-'),
    patientMobile: patient?.mobile || '',
    fileNumber: fileNum,
    doctorId: task.doctorId || '',
    doctorName: doctor?.name || (task.doctorId ? 'پزشک نامشخص' : '-'),
    practice: task.practice as 'aesthetic' | 'dental',
    type: task.type as any,
    title: task.title || undefined,
    description: task.description,
    dueDate: task.dueDate,
    status: task.status as any,
    resultNote: task.resultNote || undefined,
    updatedAt: task.updatedAt || undefined,
    createdAt: task.createdAt || undefined
  };
}

export async function followupsRouter(fastify: FastifyInstance) {
  // GET /api/tasks
  fastify.get('/', async (request, reply) => {
    try {
      const { practice, status, dueDate, patientId, type } = request.query as {
        practice?: string;
        status?: string;
        dueDate?: string;
        patientId?: string;
        type?: string;
      };

      let tasks = db.select().from(followUpTasks).all();

      if (practice && practice !== 'unified') {
        tasks = tasks.filter(t => t.practice === practice || t.practice === 'unified');
      }
      if (status) {
        tasks = tasks.filter(t => t.status === status);
      }
      if (dueDate) {
        const stdDue = toStandardJalaliDbDate(dueDate);
        tasks = tasks.filter(t => t.dueDate === stdDue);
      }
      if (patientId) {
        tasks = tasks.filter(t => t.patientId === patientId);
      }
      if (type) {
        tasks = tasks.filter(t => t.type === type);
      }

      tasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || b.id.localeCompare(a.id));

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = tasks.map(t => formatTaskData(t, patientMap, doctorMap, membershipMap));

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت لیست یادآوری‌ها'
      });
    }
  });

  // GET /api/action-center (Unified Action Center endpoint)
  fastify.get('/action-center', async (request, reply) => {
    try {
      const { practice, status } = request.query as { practice?: string; status?: string };
      const todayStr = getTodayJalaliStr();
      const tomorrowStr = getTomorrowJalaliStr();

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const items: any[] = [];

      // 1. Manual / Saved Follow-up Tasks
      let tasks = db.select().from(followUpTasks).all();
      if (practice && practice !== 'unified') {
        tasks = tasks.filter(t => t.practice === practice || t.practice === 'unified');
      }
      if (status && status !== 'all') {
        tasks = tasks.filter(t => t.status === status);
      }

      for (const t of tasks) {
        const formatted = formatTaskData(t, patientMap, doctorMap, membershipMap);
        items.push({
          ...formatted,
          source: 'manual',
          actionable: true
        });
      }

      // 2. Dynamic System Items: Due Debts (Only if not filtering by completed status)
      if (!status || status === 'pending' || status === 'all') {
        let obs = db.select().from(financialObligations).all();
        if (practice && practice !== 'unified') {
          obs = obs.filter(o => o.practice === practice);
        }
        obs = obs.filter(o => o.dueDate && o.dueDate <= todayStr);

        const allReceipts = db.select().from(paymentReceipts).all();
        const receiptsByOb = new Map<string, number>();
        for (const r of allReceipts) {
          if (r.obligationId) {
            const curr = receiptsByOb.get(r.obligationId) || 0;
            receiptsByOb.set(r.obligationId, curr + r.paidAmount);
          }
        }

        for (const ob of obs) {
          const paid = receiptsByOb.get(ob.id) || 0;
          const rem = Math.max(0, (ob.totalCost - ob.discount) - paid);
          if (rem > 0) {
            const pt = patientMap.get(ob.patientId);
            const fileNum = membershipMap.get(`${ob.patientId}_${ob.practice}`) || pt?.fileNumber || '-';
            items.push({
              id: `debt-${ob.id}`,
              source: 'debt',
              type: 'debt_reminder',
              title: `پیگیری بدهی سررسیدشده ${pt?.name || 'بیمار'}`,
              description: `مانده بدهی ${rem.toLocaleString('fa-IR')} تومانی بابت ${ob.serviceName}`,
              patientId: ob.patientId,
              patientName: pt?.name || 'بیمار نامشخص',
              patientMobile: pt?.mobile || '',
              fileNumber: fileNum,
              practice: ob.practice,
              dueDate: ob.dueDate,
              status: 'pending',
              amount: rem,
              actionable: true
            });
          }
        }

        // 3. Dynamic System Items: Unsettled Visits
        let apts = db.select().from(appointments).all();
        if (practice && practice !== 'unified') {
          apts = apts.filter(a => a.practice === practice);
        }
        const unsettledApts = apts.filter(a => a.status === 'unsettled');
        for (const a of unsettledApts) {
          const pt = patientMap.get(a.patientId);
          const fileNum = membershipMap.get(`${a.patientId}_${a.practice}`) || pt?.fileNumber || '-';
          items.push({
            id: `unsettled-${a.id}`,
            source: 'visit',
            type: 'visit_followup',
            title: `تعیین تکلیف مالی نوبت ${pt?.name || 'بیمار'}`,
            description: `نوبت تاریخ ${a.date} ساعت ${a.timeSlot} نیاز به تسویه حساب دارد`,
            patientId: a.patientId,
            patientName: pt?.name || 'بیمار نامشخص',
            patientMobile: pt?.mobile || '',
            fileNumber: fileNum,
            practice: a.practice,
            dueDate: a.date,
            status: 'pending',
            actionable: true
          });
        }
      }

      items.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

      return reply.send({
        success: true,
        data: items
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت مرکز اقدامات'
      });
    }
  });

  // GET /api/tasks/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const task = db.select().from(followUpTasks).where(eq(followUpTasks.id, id)).get();

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: 'یادآوری مورد نظر یافت نشد'
        });
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = formatTaskData(task, patientMap, doctorMap, membershipMap);

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت یادآوری'
      });
    }
  });

  // POST /api/tasks
  fastify.post('/', async (request, reply) => {
    try {
      const result = createTaskSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات یادآوری معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const taskId = data.id || `flw-${Date.now()}`;
      const stdDue = toStandardJalaliDbDate(data.dueDate);
      const todayStr = getTodayJalaliStr();

      db.insert(followUpTasks).values({
        id: taskId,
        patientId: data.patientId || null,
        doctorId: data.doctorId || null,
        practice: data.practice,
        type: data.type,
        title: data.title || null,
        description: data.description,
        dueDate: stdDue,
        status: data.status,
        resultNote: data.resultNote || null,
        updatedAt: todayStr,
        createdAt: todayStr
      }).run();

      const created = db.select().from(followUpTasks).where(eq(followUpTasks.id, taskId)).get();
      if (!created) {
        throw new Error('Failed to retrieve inserted task');
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = formatTaskData(created, patientMap, doctorMap, membershipMap);

      return reply.status(201).send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت یادآوری جدید'
      });
    }
  });

  // PATCH /api/tasks/:id
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const targetTask = db.select().from(followUpTasks).where(eq(followUpTasks.id, id)).get();

      if (!targetTask) {
        return reply.status(404).send({
          success: false,
          error: 'یادآوری مورد نظر یافت نشد'
        });
      }

      const result = updateTaskSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات تغییر یافته معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const todayStr = getTodayJalaliStr();

      const updatedFields: Partial<typeof followUpTasks.$inferSelect> = {
        updatedAt: todayStr
      };
      if (data.patientId !== undefined) updatedFields.patientId = data.patientId || null;
      if (data.doctorId !== undefined) updatedFields.doctorId = data.doctorId || null;
      if (data.practice !== undefined) updatedFields.practice = data.practice;
      if (data.type !== undefined) updatedFields.type = data.type;
      if (data.title !== undefined) updatedFields.title = data.title || null;
      if (data.description !== undefined) updatedFields.description = data.description;
      if (data.dueDate !== undefined) updatedFields.dueDate = toStandardJalaliDbDate(data.dueDate);
      if (data.status !== undefined) updatedFields.status = data.status;
      if (data.resultNote !== undefined) updatedFields.resultNote = data.resultNote || null;

      db.update(followUpTasks).set(updatedFields).where(eq(followUpTasks.id, id)).run();

      const updated = db.select().from(followUpTasks).where(eq(followUpTasks.id, id)).get();
      if (!updated) {
        throw new Error('Failed to retrieve updated task');
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allDoctors = db.select().from(doctors).all();
      const doctorMap = new Map(allDoctors.map(d => [d.id, d]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

      const formatted = formatTaskData(updated, patientMap, doctorMap, membershipMap);

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در به روزرسانی یادآوری'
      });
    }
  });
}
