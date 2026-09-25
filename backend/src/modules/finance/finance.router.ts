import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, sqlite } from '../../config/database';
import { financialObligations, paymentReceipts } from '../../db/schema/finance';
import { expenses } from '../../db/schema/expenses';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { services } from '../../db/schema/services';
import { paymentAccounts } from '../../db/schema/paymentAccounts';
import { eq, and } from 'drizzle-orm';
import { toStandardJalaliDbDate } from '../../utils/dateUtils';
import { sanitizeFreeText } from '../../utils/validation';
import moment from 'jalali-moment';

function getTodayJalaliStr(): string {
  return moment().locale('fa').format('YYYY-MM-DD');
}

const createObligationSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, 'شناسه بیمار الزامی است'),
  appointmentId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  practice: z.enum(['aesthetic', 'dental']),
  serviceDate: z.string().optional(),
  recordDate: z.string().optional(),
  serviceName: z.string().min(1, 'نام خدمت الزامی است'),
  totalCost: z.number().min(0, 'مبلغ خدمت نباید منفی باشد'),
  discount: z.number().min(0).optional().default(0),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 1000)),
  // Initial Payment at checkout
  paidAmount: z.number().min(0).optional().default(0),
  paymentMethod: z.enum(['cash', 'pos_aesthetic', 'pos_dental', 'card_transfer']).optional(),
  paymentAccountId: z.string().optional().nullable(),
  posAccount: z.string().optional().nullable(),
  timestamp: z.string().optional().nullable()
});

const createPaymentSchema = z.object({
  id: z.string().optional(),
  obligationId: z.string().optional().nullable(),
  patientId: z.string().min(1, 'شناسه بیمار الزامی است'),
  appointmentId: z.string().optional().nullable(),
  practice: z.enum(['aesthetic', 'dental']),
  recordDate: z.string().optional(),
  serviceDate: z.string().optional().nullable(),
  paidAmount: z.number().min(0, 'مبلغ دریافت نباید منفی باشد'),
  paymentMethod: z.enum(['cash', 'pos_aesthetic', 'pos_dental', 'card_transfer']).optional(),
  paymentAccountId: z.string().optional().nullable(),
  posAccount: z.string().optional().nullable(),
  timestamp: z.string().optional().nullable(),
  debtDueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 1000))
});

const createExpenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'عنوان هزینه الزامی است'),
  category: z.enum(['consumables', 'rent', 'salaries', 'equipment', 'utilities', 'other']),
  amount: z.number().min(1, 'مبلغ هزینه باید بزرگتر از صفر باشد'),
  date: z.string().min(1, 'تاریخ هزینه الزامی است'),
  practice: z.enum(['aesthetic', 'dental', 'unified']),
  recordedBy: z.string().min(1, 'ثبت‌کننده الزامی است'),
  description: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable()
});

const updateExpenseSchema = createExpenseSchema.partial();

// Helper to format an obligation + linked receipts into FinancialTransaction structure
function buildFormattedTransactions() {
  const allPts = db.select().from(patients).all();
  const patientMap = new Map(allPts.map(p => [p.id, p]));

  const allMemberships = db.select().from(patientPracticeMemberships).all();
  const memMap = new Map(allMemberships.map(m => [`${m.patientId}_${m.practice}`, m.physicalFileNumber]));

  const allObs = db.select().from(financialObligations).all();
  const allReceipts = db.select().from(paymentReceipts).all();

  // Group receipts by obligationId
  const receiptsByOb = new Map<string, (typeof paymentReceipts.$inferSelect)[]>();
  for (const r of allReceipts) {
    if (r.obligationId) {
      const list = receiptsByOb.get(r.obligationId) || [];
      list.push(r);
      receiptsByOb.set(r.obligationId, list);
    }
  }

  const result: any[] = [];

  // 1. Obligations (Treatment / Service Items)
  for (const ob of allObs) {
    const pt = patientMap.get(ob.patientId);
    const fileNum = memMap.get(`${ob.patientId}_${ob.practice}`) || pt?.fileNumber || '-';
    const linkedReceipts = receiptsByOb.get(ob.id) || [];
    const totalPaid = linkedReceipts.reduce((sum, r) => sum + r.paidAmount, 0);
    const netCost = ob.totalCost - ob.discount;
    const remainingDebt = Math.max(0, netCost - totalPaid);

    // Initial receipt if any was created with obligation
    const initialReceipt = linkedReceipts.length > 0 ? linkedReceipts[0] : null;

    result.push({
      id: ob.id,
      patientId: ob.patientId,
      patientName: pt?.name || 'بیمار نامشخص',
      fileNumber: fileNum,
      appointmentId: ob.appointmentId || undefined,
      practice: ob.practice as 'aesthetic' | 'dental',
      date: ob.recordDate,
      serviceDate: ob.serviceDate,
      timestamp: initialReceipt?.timestamp || '12:00',
      serviceName: ob.serviceName,
      totalCost: ob.totalCost,
      discount: ob.discount,
      netCost: netCost,
      paidAmount: totalPaid,
      remainingDebt: remainingDebt,
      paymentMethod: (initialReceipt?.paymentMethod as any) || 'cash',
      posAccount: initialReceipt?.posAccount || 'نقد',
      debtDueDate: ob.dueDate || undefined,
      lastActionDate: ob.recordDate,
      notes: ob.notes || undefined,
      trxType: 'service',
      obligationId: ob.id
    });
  }

  // 2. Payment Receipts (Independent Receipts)
  for (const r of allReceipts) {
    const pt = patientMap.get(r.patientId);
    const fileNum = memMap.get(`${r.patientId}_${r.practice}`) || pt?.fileNumber || '-';
    
    // Calculate remaining debt for obligation at or after this receipt
    let remaining = 0;
    if (r.obligationId) {
      const ob = allObs.find(o => o.id === r.obligationId);
      if (ob) {
        const linked = receiptsByOb.get(ob.id) || [];
        const totalPaidSoFar = linked
          .filter(l => l.recordDate <= r.recordDate || l.id === r.id)
          .reduce((sum, l) => sum + l.paidAmount, 0);
        remaining = Math.max(0, (ob.totalCost - ob.discount) - totalPaidSoFar);
      }
    }

    result.push({
      id: r.id,
      patientId: r.patientId,
      patientName: pt?.name || 'بیمار نامشخص',
      fileNumber: fileNum,
      appointmentId: r.appointmentId || undefined,
      practice: r.practice as 'aesthetic' | 'dental',
      date: r.recordDate,
      serviceDate: r.serviceDate || r.recordDate,
      timestamp: r.timestamp || '12:00',
      serviceName: r.paidAmount > 0 ? 'دریافت / وصول قسط بیمار' : 'تعیین سررسید بدهی بیمار',
      totalCost: 0,
      discount: 0,
      netCost: 0,
      paidAmount: r.paidAmount,
      remainingDebt: remaining,
      paymentMethod: (r.paymentMethod as any) || 'cash',
      posAccount: r.posAccount || 'نقد',
      debtDueDate: r.debtDueDate || undefined,
      lastActionDate: r.recordDate,
      notes: r.notes || undefined,
      trxType: 'payment',
      obligationId: r.obligationId || undefined
    });
  }

  // Sort by date DESC, then id DESC
  result.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return result;
}

export async function financeRouter(fastify: FastifyInstance) {
  // GET /api/finance/summary
  fastify.get('/summary', async (request, reply) => {
    try {
      const { practice, date, patientId } = request.query as { practice?: string; date?: string; patientId?: string };

      let obs = db.select().from(financialObligations).all();
      let receipts = db.select().from(paymentReceipts).all();
      let exps = db.select().from(expenses).all();

      if (practice && practice !== 'unified') {
        obs = obs.filter(o => o.practice === practice);
        receipts = receipts.filter(r => r.practice === practice);
        exps = exps.filter(e => e.practice === practice || e.practice === 'unified');
      }

      if (patientId) {
        obs = obs.filter(o => o.patientId === patientId);
        receipts = receipts.filter(r => r.patientId === patientId);
      }

      if (date) {
        const stdDate = toStandardJalaliDbDate(date);
        receipts = receipts.filter(r => r.recordDate === stdDate);
        exps = exps.filter(e => e.date === stdDate);
      }

      const totalIncome = receipts.reduce((sum, r) => sum + r.paidAmount, 0);
      const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0);

      // Total Outstanding Debt Calculation
      const allReceiptsMap = new Map<string, number>();
      const allReceipts = db.select().from(paymentReceipts).all();
      for (const r of allReceipts) {
        if (r.obligationId) {
          const current = allReceiptsMap.get(r.obligationId) || 0;
          allReceiptsMap.set(r.obligationId, current + r.paidAmount);
        }
      }

      let totalOutstanding = 0;
      for (const ob of obs) {
        const paid = allReceiptsMap.get(ob.id) || 0;
        const net = ob.totalCost - ob.discount;
        const rem = Math.max(0, net - paid);
        totalOutstanding += rem;
      }

      return reply.send({
        success: true,
        data: {
          totalIncome,
          totalExpenses,
          totalOutstanding,
          netBalance: totalIncome - totalExpenses
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت خلاصه مالی'
      });
    }
  });

  // GET /api/finance/transactions (All financial history items)
  fastify.get('/transactions', async (request, reply) => {
    try {
      const { practice, patientId } = request.query as { practice?: string; patientId?: string };
      let trxs = buildFormattedTransactions();

      if (practice && practice !== 'unified') {
        trxs = trxs.filter(t => t.practice === practice);
      }
      if (patientId) {
        trxs = trxs.filter(t => t.patientId === patientId);
      }

      return reply.send({
        success: true,
        data: trxs
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت تراکنش‌های مالی'
      });
    }
  });

  // GET /api/finance/obligations
  fastify.get('/obligations', async (request, reply) => {
    try {
      const { practice, patientId, status, dueDate, date } = request.query as {
        practice?: string;
        patientId?: string;
        status?: string;
        dueDate?: string;
        date?: string;
      };

      let obs = db.select().from(financialObligations).all();

      if (practice && practice !== 'unified') {
        obs = obs.filter(o => o.practice === practice);
      }
      if (patientId) {
        obs = obs.filter(o => o.patientId === patientId);
      }
      if (dueDate) {
        const stdDue = toStandardJalaliDbDate(dueDate);
        obs = obs.filter(o => o.dueDate === stdDue);
      }
      if (date) {
        const stdDate = toStandardJalaliDbDate(date);
        obs = obs.filter(o => o.serviceDate === stdDate || o.recordDate === stdDate);
      }

      const allReceipts = db.select().from(paymentReceipts).all();
      const receiptsByOb = new Map<string, number>();
      for (const r of allReceipts) {
        if (r.obligationId) {
          const curr = receiptsByOb.get(r.obligationId) || 0;
          receiptsByOb.set(r.obligationId, curr + r.paidAmount);
        }
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const todayStr = getTodayJalaliStr();

      const result = obs.map(ob => {
        const pt = patientMap.get(ob.patientId);
        const paid = receiptsByOb.get(ob.id) || 0;
        const net = ob.totalCost - ob.discount;
        const remainingDebt = Math.max(0, net - paid);
        let obStatus = 'pending';
        if (remainingDebt === 0) obStatus = 'paid';
        else if (ob.dueDate && ob.dueDate < todayStr) obStatus = 'overdue';

        return {
          id: ob.id,
          patientId: ob.patientId,
          patientName: pt?.name || 'بیمار نامشخص',
          appointmentId: ob.appointmentId || undefined,
          serviceId: ob.serviceId || undefined,
          practice: ob.practice,
          serviceDate: ob.serviceDate,
          recordDate: ob.recordDate,
          serviceName: ob.serviceName,
          totalCost: ob.totalCost,
          discount: ob.discount,
          netCost: net,
          totalPaid: paid,
          remainingDebt: remainingDebt,
          dueDate: ob.dueDate || undefined,
          status: obStatus,
          notes: ob.notes || undefined
        };
      });

      let finalResult = result;
      if (status) {
        finalResult = result.filter(r => r.status === status);
      }

      return reply.send({
        success: true,
        data: finalResult
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت لیست تعهدات مالی'
      });
    }
  });

  // GET /api/finance/obligations/:id
  fastify.get('/obligations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const ob = db.select().from(financialObligations).where(eq(financialObligations.id, id)).get();

      if (!ob) {
        return reply.status(404).send({
          success: false,
          error: 'تعهد مالی مورد نظر یافت نشد'
        });
      }

      const receipts = db.select().from(paymentReceipts).where(eq(paymentReceipts.obligationId, id)).all();
      const totalPaid = receipts.reduce((sum, r) => sum + r.paidAmount, 0);
      const net = ob.totalCost - ob.discount;
      const remainingDebt = Math.max(0, net - totalPaid);

      return reply.send({
        success: true,
        data: {
          ...ob,
          netCost: net,
          totalPaid,
          remainingDebt,
          receipts
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت تعهد مالی'
      });
    }
  });

  // POST /api/finance/obligations (Create Obligation + Optional Initial Payment)
  fastify.post('/obligations', async (request, reply) => {
    try {
      const result = createObligationSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات تعهد مالی معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const todayStr = getTodayJalaliStr();
      const srvDate = data.serviceDate ? toStandardJalaliDbDate(data.serviceDate) : todayStr;
      const recDate = data.recordDate ? toStandardJalaliDbDate(data.recordDate) : srvDate;

      // Validate Patient
      const pt = db.select().from(patients).where(eq(patients.id, data.patientId)).get();
      if (!pt) {
        return reply.status(400).send({
          success: false,
          error: 'بیمار انتخاب‌شده یافت نشد.'
        });
      }

      // Check if an obligation already exists for this appointmentId
      if (data.appointmentId) {
        const existingOb = db.select().from(financialObligations)
          .where(eq(financialObligations.appointmentId, data.appointmentId))
          .get();
        if (existingOb) {
          return reply.status(400).send({
            success: false,
            error: 'برای این نوبت قبلاً تسویه مالی ثبت شده است.'
          });
        }
      }

      // Determine Due Date (Default payment terms if serviceId exists)
      let effectiveDueDate = data.dueDate ? toStandardJalaliDbDate(data.dueDate) : null;
      const netCost = data.totalCost - data.discount;

      if (!effectiveDueDate && data.serviceId) {
        const srv = db.select().from(services).where(eq(services.id, data.serviceId)).get();
        if (srv?.defaultPaymentTermDays && srv.defaultPaymentTermDays > 0) {
          effectiveDueDate = moment(srvDate, 'YYYY-MM-DD').add(srv.defaultPaymentTermDays, 'days').format('YYYY-MM-DD');
        }
      }

      // Initial Payment Overpayment check
      const initialPaid = data.paidAmount || 0;
      if (initialPaid > netCost) {
        return reply.status(400).send({
          success: false,
          error: 'مبلغ دریافت‌شده نمی‌تواند بیشتر از بدهی باقیمانده باشد.'
        });
      }

      // If initial payment > 0, validate payment account
      if (initialPaid > 0) {
        if (data.paymentAccountId) {
          const acc = db.select().from(paymentAccounts).where(eq(paymentAccounts.id, data.paymentAccountId)).get();
          if (acc && acc.practice !== data.practice) {
            return reply.status(400).send({
              success: false,
              error: 'حساب انتخاب‌شده متعلق به این مطب نیست.'
            });
          }
        }
      }

      const obId = data.id || `ob-${Date.now()}`;

      try {
        sqlite.transaction(() => {
          // Insert Obligation
          db.insert(financialObligations).values({
            id: obId,
            patientId: data.patientId,
            appointmentId: data.appointmentId || null,
            serviceId: data.serviceId || null,
            practice: data.practice,
            serviceDate: srvDate,
            recordDate: recDate,
            serviceName: data.serviceName,
            totalCost: data.totalCost,
            discount: data.discount,
            netCost: netCost,
            dueDate: effectiveDueDate,
            notes: data.notes || null
          }).run();

          // Create Initial Payment Receipt if paidAmount > 0
          if (initialPaid > 0) {
            const receiptId = `pay-${obId}-${Date.now()}`;
            const method = data.paymentMethod || (data.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
            db.insert(paymentReceipts).values({
              id: receiptId,
              obligationId: obId,
              patientId: data.patientId,
              appointmentId: data.appointmentId || null,
              practice: data.practice,
              recordDate: recDate,
              serviceDate: srvDate,
              paidAmount: initialPaid,
              paymentMethod: method,
              paymentAccountId: data.paymentAccountId || null,
              posAccount: data.posAccount || (method === 'cash' ? 'نقد' : 'کارتخوان'),
              timestamp: data.timestamp || '12:00',
              debtDueDate: (netCost - initialPaid > 0) ? effectiveDueDate : null,
              notes: data.notes || 'پرداخت اولیه هنگام ثبت خدمت'
            }).run();
          }
        })();
      } catch (txnErr: any) {
        throw txnErr;
      }

      return reply.status(201).send({
        success: true,
        data: {
          id: obId,
          patientId: data.patientId,
          practice: data.practice,
          netCost,
          paidAmount: initialPaid,
          remainingDebt: Math.max(0, netCost - initialPaid),
          dueDate: effectiveDueDate
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت تعهد مالی'
      });
    }
  });

  // POST /api/finance/payments (Create Independent Payment Receipt)
  fastify.post('/payments', async (request, reply) => {
    try {
      const result = createPaymentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات دریافت وجه معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const todayStr = getTodayJalaliStr();
      const recDate = data.recordDate ? toStandardJalaliDbDate(data.recordDate) : todayStr;

      // Backdated / Future Date Rule: recordDate CANNOT be in the future!
      if (recDate > todayStr) {
        return reply.status(400).send({
          success: false,
          error: 'تاریخ ثبت دریافت نمی‌تواند در آینده باشد.'
        });
      }

      // Validate Patient
      const pt = db.select().from(patients).where(eq(patients.id, data.patientId)).get();
      if (!pt) {
        return reply.status(400).send({
          success: false,
          error: 'بیمار انتخاب‌شده یافت نشد.'
        });
      }

      const paymentAmt = data.paidAmount;

      // For Payment Amount > 0: Payment Account is REQUIRED
      if (paymentAmt > 0) {
        if (!data.posAccount && !data.paymentAccountId) {
          return reply.status(400).send({
            success: false,
            error: 'حساب دریافت وجه معتبر نیست.'
          });
        }
        if (data.paymentAccountId) {
          const acc = db.select().from(paymentAccounts).where(eq(paymentAccounts.id, data.paymentAccountId)).get();
          if (acc && acc.practice !== data.practice) {
            return reply.status(400).send({
              success: false,
              error: 'حساب انتخاب‌شده متعلق به این مطب نیست.'
            });
          }
        }
      }

      let receiptId = data.id || `pay-${Date.now()}`;
      let targetObId = data.obligationId || null;
      let remainingAfter = 0;

      try {
        sqlite.transaction(() => {
          // Find matching active obligation
          let ob = targetObId ? db.select().from(financialObligations).where(eq(financialObligations.id, targetObId)).get() : null;

          if (!ob) {
            // Find active obligation for patient in practice with remaining debt > 0
            const patientObs = db.select().from(financialObligations)
              .where(and(
                eq(financialObligations.patientId, data.patientId),
                eq(financialObligations.practice, data.practice)
              )).all();

            for (const candidate of patientObs) {
              const receipts = db.select().from(paymentReceipts).where(eq(paymentReceipts.obligationId, candidate.id)).all();
              const paid = receipts.reduce((sum, r) => sum + r.paidAmount, 0);
              const rem = (candidate.totalCost - candidate.discount) - paid;
              if (rem > 0) {
                ob = candidate;
                targetObId = candidate.id;
                break;
              }
            }
          }

          if (ob) {
            // Calculate current live remaining debt for obligation BEFORE this payment
            const existingReceipts = db.select().from(paymentReceipts).where(eq(paymentReceipts.obligationId, ob.id)).all();
            const totalPaidSoFar = existingReceipts.reduce((sum, r) => sum + r.paidAmount, 0);
            const net = ob.totalCost - ob.discount;
            const currentRemaining = Math.max(0, net - totalPaidSoFar);

            // Overpayment protection
            if (currentRemaining === 0) {
              throw new Error('OVERPAYMENT:بدهی مربوط به این نوبت/تعهد قبلاً کاملاً تسویه شده است.');
            }
            if (paymentAmt > currentRemaining) {
              throw new Error('OVERPAYMENT:مبلغ دریافت‌شده نمی‌تواند بیشتر از بدهی باقیمانده باشد.');
            }

            remainingAfter = Math.max(0, currentRemaining - paymentAmt);

            // If debtDueDate is provided, update obligation.dueDate
            if (data.debtDueDate) {
              const newDue = toStandardJalaliDbDate(data.debtDueDate);
              db.update(financialObligations).set({ dueDate: newDue }).where(eq(financialObligations.id, ob.id)).run();
            }
          } else {
            // No obligation exists (or general prepayment)
            remainingAfter = 0;
          }

          // Determine method
          let method = data.paymentMethod || 'cash';
          if (data.posAccount) {
            if (data.posAccount.includes('نقد')) method = 'cash';
            else if (data.posAccount.includes('کارت به کارت')) method = 'card_transfer';
            else method = data.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental';
          }

          // Insert Payment Receipt
          db.insert(paymentReceipts).values({
            id: receiptId,
            obligationId: targetObId,
            patientId: data.patientId,
            appointmentId: data.appointmentId || ob?.appointmentId || null,
            practice: data.practice,
            recordDate: recDate,
            serviceDate: data.serviceDate ? toStandardJalaliDbDate(data.serviceDate) : (ob?.serviceDate || recDate),
            paidAmount: paymentAmt,
            paymentMethod: method,
            paymentAccountId: data.paymentAccountId || null,
            posAccount: data.posAccount || (paymentAmt === 0 ? 'تعیین سررسید بدهی' : 'صندوق نقدی مطب'),
            timestamp: data.timestamp || '12:00',
            debtDueDate: remainingAfter > 0 ? (data.debtDueDate ? toStandardJalaliDbDate(data.debtDueDate) : ob?.dueDate || null) : null,
            notes: data.notes || (paymentAmt > 0 ? 'ثبت دریافت وجه' : 'تعیین سررسید بدهی بدون دریافت وجه')
          }).run();
        })();
      } catch (txnErr: any) {
        if (txnErr.message?.startsWith('OVERPAYMENT:')) {
          return reply.status(400).send({
            success: false,
            error: txnErr.message.replace('OVERPAYMENT:', '')
          });
        }
        throw txnErr;
      }

      return reply.status(201).send({
        success: true,
        data: {
          id: receiptId,
          obligationId: targetObId,
          patientId: data.patientId,
          practice: data.practice,
          paidAmount: paymentAmt,
          remainingDebt: remainingAfter
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت دریافت وجه'
      });
    }
  });

  // GET /api/finance/expenses
  fastify.get('/expenses', async (request, reply) => {
    try {
      const { practice } = request.query as { practice?: string };
      let allExps = db.select().from(expenses).all();

      if (practice && practice !== 'unified') {
        allExps = allExps.filter(e => e.practice === practice || e.practice === 'unified');
      }

      allExps.sort((a, b) => b.date.localeCompare(a.date));

      return reply.send({
        success: true,
        data: allExps
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت لیست هزینه‌ها'
      });
    }
  });

  // POST /api/finance/expenses
  fastify.post('/expenses', async (request, reply) => {
    try {
      const result = createExpenseSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات ثبت هزینه معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const expId = data.id || `exp-${Date.now()}`;
      const stdDate = toStandardJalaliDbDate(data.date);

      db.insert(expenses).values({
        id: expId,
        title: data.title,
        category: data.category,
        amount: data.amount,
        date: stdDate,
        practice: data.practice,
        recordedBy: data.recordedBy,
        description: data.description || null,
        receiptNumber: data.receiptNumber || null
      }).run();

      const created = db.select().from(expenses).where(eq(expenses.id, expId)).get();

      return reply.status(201).send({
        success: true,
        data: created
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت هزینه جدید'
      });
    }
  });
}
