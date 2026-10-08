import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, sqlite } from '../../config/database';
import { deposits } from '../../db/schema/deposits';
import { patients, patientPracticeMemberships } from '../../db/schema/patients';
import { financialObligations, paymentReceipts } from '../../db/schema/finance';
import { appointments } from '../../db/schema/appointments';
import { services } from '../../db/schema/services';
import { paymentAccounts } from '../../db/schema/paymentAccounts';
import { doctors } from '../../db/schema/doctors';
import { eq, and, desc } from 'drizzle-orm';
import { toStandardJalaliDbDate, toEnglishDigits } from '../../utils/dateUtils';
import { sanitizeFreeText } from '../../utils/validation';
import moment from 'jalali-moment';

function getTodayJalaliStr(): string {
  return moment().locale('fa').format('YYYY-MM-DD');
}

function getCurrentTimestamp(): string {
  return moment().locale('fa').format('HH:mm');
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

const createDepositSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, 'شناسه بیمار الزامی است'),
  practice: z.enum(['aesthetic', 'dental']),
  serviceId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  newAppointment: z.object({
    date: z.string().min(1, 'تاریخ نوبت الزامی است'),
    timeSlot: z.string().min(1, 'ساعت نوبت الزامی است'),
    duration: z.number().optional().default(30),
    cabinetNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
  }).optional().nullable(),
  amount: z.number().min(1, 'مبلغ بیعانه باید بزرگتر از صفر باشد'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['cash', 'pos_aesthetic', 'pos_dental', 'card_transfer']),
  paymentAccountId: z.string().optional().nullable(),
  posAccount: z.string().optional().nullable(),
  notes: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 1000))
});

const updateDepositSchema = z.object({
  serviceId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  newAppointment: z.object({
    date: z.string().min(1, 'تاریخ نوبت الزامی است'),
    timeSlot: z.string().min(1, 'ساعت نوبت الزامی است'),
    duration: z.number().optional().default(30),
    cabinetNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
  }).optional().nullable(),
  notes: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 1000))
});

const adjustAmountSchema = z.object({
  newAmount: z.number().min(0, 'مبلغ جدید معتبر نیست'),
  paymentMethod: z.enum(['cash', 'pos_aesthetic', 'pos_dental', 'card_transfer']).optional(),
  paymentAccountId: z.string().optional().nullable(),
  posAccount: z.string().optional().nullable(),
  notes: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 500))
});

const refundDepositSchema = z.object({
  refundAmount: z.number().min(1, 'مبلغ استرداد باید بزرگتر از صفر باشد').optional(),
  paymentMethod: z.enum(['cash', 'pos_aesthetic', 'pos_dental', 'card_transfer']).optional(),
  refundMethod: z.enum(['cash', 'pos_aesthetic', 'pos_dental', 'card_transfer']).optional(),
  paymentAccountId: z.string().optional().nullable(),
  posAccount: z.string().min(1, 'حساب پرداخت الزامی است'),
  reason: z.string().optional().nullable().transform(val => sanitizeFreeText(val, 500))
}).transform(data => ({
  ...data,
  paymentMethod: data.paymentMethod || data.refundMethod || 'card_transfer'
}));

const applyDepositSchema = z.object({
  obligationId: z.string().min(1, 'شناسه خدمت / تعهد مالی الزامی است'),
  amount: z.number().min(1).optional()
});

function formatDepositItem(
  dep: typeof deposits.$inferSelect,
  patientMap: Map<string, typeof patients.$inferSelect>,
  membershipsByPatient: Map<string, (typeof patientPracticeMemberships.$inferSelect)[]>,
  serviceMap: Map<string, typeof services.$inferSelect>,
  appointmentMap: Map<string, typeof appointments.$inferSelect>
) {
  const pt = patientMap.get(dep.patientId);
  const mems = membershipsByPatient.get(dep.patientId) || [];
  const srv = dep.serviceId ? serviceMap.get(dep.serviceId) : null;
  const apt = dep.appointmentId ? appointmentMap.get(dep.appointmentId) : null;

  // Build physical file number string
  const dentalMem = mems.find(m => m.practice === 'dental');
  const aestheticMem = mems.find(m => m.practice === 'aesthetic');
  let fileNumberDisplay = '-';
  if (dentalMem && aestheticMem) {
    fileNumberDisplay = `دندان: ${dentalMem.physicalFileNumber} | زیبایی: ${aestheticMem.physicalFileNumber}`;
  } else if (dep.practice === 'dental') {
    fileNumberDisplay = dentalMem?.physicalFileNumber || pt?.fileNumber || '-';
  } else {
    fileNumberDisplay = aestheticMem?.physicalFileNumber || pt?.fileNumber || '-';
  }

  let parsedHistory: any[] = [];
  if (dep.history) {
    try {
      parsedHistory = JSON.parse(dep.history);
    } catch {
      parsedHistory = [];
    }
  }

  return {
    id: dep.id,
    patientId: dep.patientId,
    patientName: pt?.name || 'بیمار نامشخص',
    patientMobile: pt?.mobile || '',
    fileNumber: fileNumberDisplay,
    memberships: mems.map(m => ({ practice: m.practice, physicalFileNumber: m.physicalFileNumber })),
    practice: dep.practice as 'aesthetic' | 'dental',
    serviceId: dep.serviceId || undefined,
    serviceName: srv?.name || undefined,
    servicePrice: srv?.price || undefined,
    appointmentId: dep.appointmentId || undefined,
    appointmentDate: apt?.date || undefined,
    appointmentTimeSlot: apt?.timeSlot || undefined,
    appointmentStatus: apt?.status || undefined,
    initialAmount: dep.initialAmount,
    remainingAmount: dep.remainingAmount,
    status: dep.status as any,
    paymentReceiptId: dep.paymentReceiptId || undefined,
    serviceObligationId: dep.serviceObligationId || undefined,
    paymentMethod: dep.paymentMethod as any,
    paymentAccountId: dep.paymentAccountId || undefined,
    posAccount: dep.posAccount || 'نقد',
    paymentDate: dep.paymentDate,
    notes: dep.notes || undefined,
    history: parsedHistory,
    createdAt: dep.createdAt
  };
}

function getFormattedDepositById(id: string) {
  const dep = db.select().from(deposits).where(eq(deposits.id, id)).get();
  if (!dep) return null;

  const allPatients = db.select().from(patients).all();
  const patientMap = new Map(allPatients.map(p => [p.id, p]));

  const allMemberships = db.select().from(patientPracticeMemberships).all();
  const membershipsByPatient = new Map<string, (typeof patientPracticeMemberships.$inferSelect)[]>();
  for (const m of allMemberships) {
    const list = membershipsByPatient.get(m.patientId) || [];
    list.push(m);
    membershipsByPatient.set(m.patientId, list);
  }

  const allServices = db.select().from(services).all();
  const serviceMap = new Map(allServices.map(s => [s.id, s]));

  const allAppointments = db.select().from(appointments).all();
  const appointmentMap = new Map(allAppointments.map(a => [a.id, a]));

  return formatDepositItem(dep, patientMap, membershipsByPatient, serviceMap, appointmentMap);
}

export async function depositsRouter(fastify: FastifyInstance) {
  // GET /api/deposits
  fastify.get('/', async (request, reply) => {
    try {
      const { practice, patientId, status } = request.query as {
        practice?: string;
        patientId?: string;
        status?: string;
      };

      let allDeposits = db.select().from(deposits).all();

      if (practice && (practice === 'aesthetic' || practice === 'dental')) {
        allDeposits = allDeposits.filter(d => d.practice === practice);
      }
      if (patientId) {
        allDeposits = allDeposits.filter(d => d.patientId === patientId);
      }
      if (status) {
        allDeposits = allDeposits.filter(d => d.status === status);
      }

      // Sort by paymentDate DESC, id DESC
      allDeposits.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.id.localeCompare(a.id));

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipsByPatient = new Map<string, (typeof patientPracticeMemberships.$inferSelect)[]>();
      for (const m of allMemberships) {
        const list = membershipsByPatient.get(m.patientId) || [];
        list.push(m);
        membershipsByPatient.set(m.patientId, list);
      }

      const allServices = db.select().from(services).all();
      const serviceMap = new Map(allServices.map(s => [s.id, s]));

      const allAppointments = db.select().from(appointments).all();
      const appointmentMap = new Map(allAppointments.map(a => [a.id, a]));

      const formatted = allDeposits.map(d =>
        formatDepositItem(d, patientMap, membershipsByPatient, serviceMap, appointmentMap)
      );

      return reply.send({
        success: true,
        data: formatted
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت لیست بیعانه‌ها'
      });
    }
  });

  // GET /api/deposits/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dep = db.select().from(deposits).where(eq(deposits.id, id)).get();

      if (!dep) {
        return reply.status(404).send({
          success: false,
          error: 'پرونده بیعانه مورد نظر یافت نشد'
        });
      }

      const allPatients = db.select().from(patients).all();
      const patientMap = new Map(allPatients.map(p => [p.id, p]));

      const allMemberships = db.select().from(patientPracticeMemberships).all();
      const membershipsByPatient = new Map<string, (typeof patientPracticeMemberships.$inferSelect)[]>();
      for (const m of allMemberships) {
        const list = membershipsByPatient.get(m.patientId) || [];
        list.push(m);
        membershipsByPatient.set(m.patientId, list);
      }

      const allServices = db.select().from(services).all();
      const serviceMap = new Map(allServices.map(s => [s.id, s]));

      const allAppointments = db.select().from(appointments).all();
      const appointmentMap = new Map(allAppointments.map(a => [a.id, a]));

      const formatted = formatDepositItem(dep, patientMap, membershipsByPatient, serviceMap, appointmentMap);

      // Also get linked receipts
      const linkedReceipts = db.select().from(paymentReceipts).where(eq(paymentReceipts.depositId, id)).all();

      return reply.send({
        success: true,
        data: {
          ...formatted,
          linkedReceipts
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در دریافت جزئیات بیعانه'
      });
    }
  });

  // POST /api/deposits
  fastify.post('/', async (request, reply) => {
    try {
      const result = createDepositSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات ثبت بیعانه معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const todayStr = getTodayJalaliStr();
      const pDate = data.paymentDate ? toStandardJalaliDbDate(data.paymentDate) : todayStr;
      const timeStr = getCurrentTimestamp();

      // 1. Verify Patient exists
      const pt = db.select().from(patients).where(eq(patients.id, data.patientId)).get();
      if (!pt) {
        return reply.status(400).send({
          success: false,
          error: 'بیمار انتخاب‌شده یافت نشد.'
        });
      }

      // 2. Verify / Handle Appointment
      let effectiveAppointmentId: string | null = data.appointmentId || null;

      if (data.newAppointment) {
        const newAptData = data.newAppointment;
        const stdAptDate = toStandardJalaliDbDate(newAptData.date);
        const stdSlot = toEnglishDigits(newAptData.timeSlot).trim();

        // Find doctor for this practice
        const doc = db.select().from(doctors).where(eq(doctors.practice, data.practice)).get();
        if (!doc) {
          return reply.status(400).send({
            success: false,
            error: 'پزشک مطب مورد نظر یافت نشد.'
          });
        }

        // Conflict check
        const existingApts = db.select().from(appointments).all();
        const conflict = existingApts.some(a => {
          if (a.status === 'canceled' || a.status === 'rescheduled') return false;
          if (a.doctorId !== doc.id) return false;
          return toStandardJalaliDbDate(a.date) === stdAptDate && toEnglishDigits(a.timeSlot).trim() === stdSlot;
        });

        if (conflict) {
          return reply.status(400).send({
            success: false,
            error: 'این زمان برای پزشک معالج قبلاً رزرو شده است.'
          });
        }

        // Ensure practice membership
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
            joinedAt: stdAptDate
          }).run();
        }

        const newAptId = `apt-${Date.now()}`;
        db.insert(appointments).values({
          id: newAptId,
          patientId: data.patientId,
          doctorId: doc.id,
          serviceId: data.serviceId || null,
          practice: data.practice,
          date: stdAptDate,
          timeSlot: stdSlot,
          duration: newAptData.duration || 30,
          status: 'pending',
          notes: newAptData.notes || `نوبت رزرو شده همراه با پرداخت بیعانه`,
          cabinetNumber: newAptData.cabinetNumber || (data.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱')
        }).run();

        effectiveAppointmentId = newAptId;
      } else if (effectiveAppointmentId) {
        // Verify existing appointment belongs to this patient & practice
        const existingApt = db.select().from(appointments).where(eq(appointments.id, effectiveAppointmentId)).get();
        if (!existingApt || existingApt.patientId !== data.patientId || existingApt.practice !== data.practice) {
          return reply.status(400).send({
            success: false,
            error: 'نوبت انتخاب‌شده معتبر نیست یا متعلق به این بیمار و مطب نمی‌باشد.'
          });
        }
      }

      // 3. Resolve service name for description
      let srvName = '';
      if (data.serviceId) {
        const srv = db.select().from(services).where(eq(services.id, data.serviceId)).get();
        if (srv) srvName = srv.name;
      }

      const depId = data.id || `dep-${Date.now()}`;
      const receiptId = `pay-${depId}`;

      const historyLog = [{
        action: 'created',
        timestamp: timeStr,
        date: pDate,
        amount: data.amount,
        details: `ثبت اولیه بیعانه به مبلغ ${data.amount.toLocaleString('fa-IR')} تومان` + (srvName ? ` بابت خدمت ${srvName}` : '')
      }];

      sqlite.transaction(() => {
        // Insert Deposit Record
        db.insert(deposits).values({
          id: depId,
          patientId: data.patientId,
          practice: data.practice,
          serviceId: data.serviceId || null,
          appointmentId: effectiveAppointmentId,
          initialAmount: data.amount,
          remainingAmount: data.amount,
          status: 'active',
          paymentReceiptId: receiptId,
          serviceObligationId: null,
          paymentMethod: data.paymentMethod,
          paymentAccountId: data.paymentAccountId || null,
          posAccount: data.posAccount || (data.paymentMethod === 'cash' ? 'نقد' : 'کارتخوان'),
          paymentDate: pDate,
          notes: data.notes || null,
          history: JSON.stringify(historyLog),
          createdAt: pDate
        }).run();

        // Insert Payment Receipt (Independent of obligations, doesn't decrease old debts!)
        db.insert(paymentReceipts).values({
          id: receiptId,
          obligationId: null,
          patientId: data.patientId,
          appointmentId: effectiveAppointmentId,
          practice: data.practice,
          recordDate: pDate,
          serviceDate: pDate,
          paidAmount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentAccountId: data.paymentAccountId || null,
          posAccount: data.posAccount || (data.paymentMethod === 'cash' ? 'نقد' : 'کارتخوان'),
          timestamp: timeStr,
          debtDueDate: null,
          notes: data.notes || `دریافت بیعانه${srvName ? ` بابت ${srvName}` : ''}`,
          depositId: depId,
          receiptType: 'deposit'
        }).run();
      })();

      const created = getFormattedDepositById(depId);

      return reply.status(201).send({
        success: true,
        data: created
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت بیعانه'
      });
    }
  });

  // PUT /api/deposits/:id
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dep = db.select().from(deposits).where(eq(deposits.id, id)).get();

      if (!dep) {
        return reply.status(404).send({
          success: false,
          error: 'بیعانه مورد نظر یافت نشد.'
        });
      }

      const result = updateDepositSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات ارسالی معتبر نیست.',
          details: result.error.format()
        });
      }

      const data = result.data;
      const todayStr = getTodayJalaliStr();
      const timeStr = getCurrentTimestamp();

      let currentHistory: any[] = [];
      try {
        currentHistory = JSON.parse(dep.history || '[]');
      } catch {
        currentHistory = [];
      }

      let newAptId = dep.appointmentId;

      if (data.newAppointment) {
        const newAptData = data.newAppointment;
        const stdAptDate = toStandardJalaliDbDate(newAptData.date);
        const stdSlot = toEnglishDigits(newAptData.timeSlot).trim();

        const doc = db.select().from(doctors).where(eq(doctors.practice, dep.practice)).get();
        if (!doc) {
          return reply.status(400).send({
            success: false,
            error: 'پزشک مطب مورد نظر یافت نشد.'
          });
        }

        const existingApts = db.select().from(appointments).all();
        const conflict = existingApts.some(a => {
          if (a.status === 'canceled' || a.status === 'rescheduled') return false;
          if (a.doctorId !== doc.id) return false;
          return toStandardJalaliDbDate(a.date) === stdAptDate && toEnglishDigits(a.timeSlot).trim() === stdSlot;
        });

        if (conflict) {
          return reply.status(400).send({
            success: false,
            error: 'این زمان برای پزشک معالج قبلاً رزرو شده است.'
          });
        }

        const aptId = `apt-${Date.now()}`;
        db.insert(appointments).values({
          id: aptId,
          patientId: dep.patientId,
          doctorId: doc.id,
          serviceId: data.serviceId !== undefined ? (data.serviceId || null) : dep.serviceId,
          practice: dep.practice,
          date: stdAptDate,
          timeSlot: stdSlot,
          duration: newAptData.duration || 30,
          status: 'pending',
          notes: newAptData.notes || `نوبت ثبت‌شده برای بیعانه`,
          cabinetNumber: newAptData.cabinetNumber || (dep.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱')
        }).run();

        newAptId = aptId;
        currentHistory.push({
          action: 'appointment_assigned',
          timestamp: timeStr,
          date: todayStr,
          details: `تعیین نوبت جدید در تاریخ ${stdAptDate} ساعت ${stdSlot}`
        });
      } else if (data.appointmentId !== undefined) {
        if (data.appointmentId !== dep.appointmentId) {
          newAptId = data.appointmentId;
          currentHistory.push({
            action: 'appointment_changed',
            timestamp: timeStr,
            date: todayStr,
            details: data.appointmentId ? `تغییر نوبت متصل به شناسه ${data.appointmentId}` : 'حذف اتصال نوبت (در انتظار تعیین نوبت)'
          });
        }
      }

      if (data.serviceId !== undefined && data.serviceId !== dep.serviceId) {
        currentHistory.push({
          action: 'service_changed',
          timestamp: timeStr,
          date: todayStr,
          details: 'تغییر خدمت پیشنهادی بیعانه'
        });
      }

      if (data.notes !== undefined && data.notes !== dep.notes) {
        currentHistory.push({
          action: 'notes_updated',
          timestamp: timeStr,
          date: todayStr,
          details: 'ویرایش توضیحات بیعانه'
        });
      }

      db.update(deposits).set({
        serviceId: data.serviceId !== undefined ? (data.serviceId || null) : dep.serviceId,
        appointmentId: newAptId,
        notes: data.notes !== undefined ? (data.notes || null) : dep.notes,
        history: JSON.stringify(currentHistory)
      }).where(eq(deposits.id, id)).run();

      const updated = getFormattedDepositById(id);

      return reply.send({
        success: true,
        data: updated
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ویرایش بیعانه'
      });
    }
  });

  // POST /api/deposits/:id/adjust-amount
  fastify.post('/:id/adjust-amount', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dep = db.select().from(deposits).where(eq(deposits.id, id)).get();

      if (!dep) {
        return reply.status(404).send({
          success: false,
          error: 'بیعانه مورد نظر یافت نشد.'
        });
      }

      if (dep.status === 'applied' || dep.status === 'refunded') {
        return reply.status(400).send({
          success: false,
          error: 'امکان اصلاح مبلغ برای بیعانه اعمال‌شده یا کاملاً مستردشده وجود ندارد.'
        });
      }

      const result = adjustAmountSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات اصلاح مبلغ معتبر نیست.',
          details: result.error.format()
        });
      }

      const { newAmount, paymentMethod, paymentAccountId, posAccount, notes } = result.data;
      const todayStr = getTodayJalaliStr();
      const timeStr = getCurrentTimestamp();

      const oldAmount = dep.initialAmount;
      if (newAmount === oldAmount) {
        return reply.send({ success: true, data: dep });
      }

      let currentHistory: any[] = [];
      try {
        currentHistory = JSON.parse(dep.history || '[]');
      } catch {
        currentHistory = [];
      }

      sqlite.transaction(() => {
        if (newAmount > oldAmount) {
          const diff = newAmount - oldAmount;
          const method = paymentMethod || dep.paymentMethod;
          const pos = posAccount || dep.posAccount || 'کارتخوان';

          // Insert additional payment receipt
          const receiptId = `pay-adj-${dep.id}-${Date.now()}`;
          db.insert(paymentReceipts).values({
            id: receiptId,
            obligationId: null,
            patientId: dep.patientId,
            appointmentId: dep.appointmentId || null,
            practice: dep.practice,
            recordDate: todayStr,
            serviceDate: todayStr,
            paidAmount: diff,
            paymentMethod: method,
            paymentAccountId: paymentAccountId || null,
            posAccount: pos,
            timestamp: timeStr,
            notes: notes || `افزایش مبلغ بیعانه از ${oldAmount.toLocaleString('fa-IR')} به ${newAmount.toLocaleString('fa-IR')}`,
            depositId: dep.id,
            receiptType: 'deposit'
          }).run();

          const newRemaining = dep.remainingAmount + diff;
          currentHistory.push({
            action: 'amount_increased',
            timestamp: timeStr,
            date: todayStr,
            amount: diff,
            details: `افزایش مبلغ بیعانه به ${newAmount.toLocaleString('fa-IR')} تومان (دریافت مابه‌التفاوت ${diff.toLocaleString('fa-IR')} تومان)`
          });

          db.update(deposits).set({
            initialAmount: newAmount,
            remainingAmount: newRemaining,
            history: JSON.stringify(currentHistory)
          }).where(eq(deposits.id, id)).run();

        } else {
          // newAmount < oldAmount: Reduction / Partial Refund
          const diff = oldAmount - newAmount;
          if (dep.remainingAmount < diff) {
            throw new Error('مبلغ باقیمانده بیعانه کمتر از میزان کاهش درخواستی است.');
          }

          const method = paymentMethod || dep.paymentMethod;
          const pos = posAccount || dep.posAccount || 'کارتخوان';

          // Insert refund receipt
          const refReceiptId = `ref-adj-${dep.id}-${Date.now()}`;
          db.insert(paymentReceipts).values({
            id: refReceiptId,
            obligationId: null,
            patientId: dep.patientId,
            appointmentId: dep.appointmentId || null,
            practice: dep.practice,
            recordDate: todayStr,
            serviceDate: todayStr,
            paidAmount: -diff, // negative amount preserves initial receipt & accounts for refund
            paymentMethod: method,
            paymentAccountId: paymentAccountId || null,
            posAccount: pos,
            timestamp: timeStr,
            notes: notes || `کاهش مبلغ بیعانه از ${oldAmount.toLocaleString('fa-IR')} به ${newAmount.toLocaleString('fa-IR')}`,
            depositId: dep.id,
            receiptType: 'refund'
          }).run();

          const newRemaining = dep.remainingAmount - diff;
          currentHistory.push({
            action: 'amount_decreased',
            timestamp: timeStr,
            date: todayStr,
            amount: diff,
            details: `کاهش مبلغ بیعانه به ${newAmount.toLocaleString('fa-IR')} تومان (استرداد مابه‌التفاوت ${diff.toLocaleString('fa-IR')} تومان)`
          });

          db.update(deposits).set({
            initialAmount: newAmount,
            remainingAmount: newRemaining,
            history: JSON.stringify(currentHistory)
          }).where(eq(deposits.id, id)).run();
        }
      })();

      const updated = getFormattedDepositById(id);
      return reply.send({
        success: true,
        data: updated
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(400).send({
        success: false,
        error: err.message || 'خطا در اصلاح مبلغ بیعانه'
      });
    }
  });

  // POST /api/deposits/:id/refund
  fastify.post('/:id/refund', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dep = db.select().from(deposits).where(eq(deposits.id, id)).get();

      if (!dep) {
        return reply.status(404).send({
          success: false,
          error: 'بیعانه مورد نظر یافت نشد.'
        });
      }

      if (dep.remainingAmount <= 0 || dep.status === 'refunded' || dep.status === 'applied') {
        return reply.status(400).send({
          success: false,
          error: 'این بیعانه قابل استرداد نیست (قبلاً تسویه یا کاملاً مسترد شده است).'
        });
      }

      const result = refundDepositSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات استرداد معتبر نیست.',
          details: result.error.format()
        });
      }

      const { refundAmount, paymentMethod, paymentAccountId, posAccount, reason } = result.data;
      const actualRefundAmt = refundAmount ? Math.min(refundAmount, dep.remainingAmount) : dep.remainingAmount;

      if (actualRefundAmt <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'مبلغ استرداد نامعتبر است.'
        });
      }

      const todayStr = getTodayJalaliStr();
      const timeStr = getCurrentTimestamp();

      let currentHistory: any[] = [];
      try {
        currentHistory = JSON.parse(dep.history || '[]');
      } catch {
        currentHistory = [];
      }

      sqlite.transaction(() => {
        const refReceiptId = `ref-${dep.id}-${Date.now()}`;
        // Insert independent refund receipt (does not delete initial receipt!)
        db.insert(paymentReceipts).values({
          id: refReceiptId,
          obligationId: null,
          patientId: dep.patientId,
          appointmentId: dep.appointmentId || null,
          practice: dep.practice,
          recordDate: todayStr,
          serviceDate: todayStr,
          paidAmount: -actualRefundAmt, // Negative receipt reflects refund in finance records
          paymentMethod: paymentMethod,
          paymentAccountId: paymentAccountId || null,
          posAccount: posAccount,
          timestamp: timeStr,
          notes: `استرداد بیعانه: ${reason || 'انصراف بیمار'}`,
          depositId: dep.id,
          receiptType: 'refund'
        }).run();

        const newRemaining = dep.remainingAmount - actualRefundAmt;
        const newStatus = newRemaining === 0 ? 'refunded' : 'partially_refunded';

        currentHistory.push({
          action: 'refunded',
          timestamp: timeStr,
          date: todayStr,
          amount: actualRefundAmt,
          details: `استرداد وجه بیعانه به مبلغ ${actualRefundAmt.toLocaleString('fa-IR')} تومان از طریق ${posAccount}` + (reason ? ` (علت: ${reason})` : '')
        });

        db.update(deposits).set({
          remainingAmount: newRemaining,
          status: newStatus,
          history: JSON.stringify(currentHistory)
        }).where(eq(deposits.id, id)).run();
      })();

      const updated = getFormattedDepositById(id);
      return reply.send({
        success: true,
        data: updated
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در ثبت استرداد بیعانه'
      });
    }
  });

  // POST /api/deposits/:id/apply
  fastify.post('/:id/apply', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dep = db.select().from(deposits).where(eq(deposits.id, id)).get();

      if (!dep) {
        return reply.status(404).send({
          success: false,
          error: 'بیعانه مورد نظر یافت نشد.'
        });
      }

      if (dep.remainingAmount <= 0 || dep.status === 'applied' || dep.status === 'refunded') {
        return reply.status(400).send({
          success: false,
          error: 'این بیعانه مانده قابل تخصیص ندارد.'
        });
      }

      const result = applyDepositSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'اطلاعات تخصیص معتبر نیست.',
          details: result.error.format()
        });
      }

      const { obligationId, amount } = result.data;
      const ob = db.select().from(financialObligations).where(eq(financialObligations.id, obligationId)).get();
      if (!ob) {
        return reply.status(404).send({
          success: false,
          error: 'تعهد مالی / خدمت مورد نظر یافت نشد.'
        });
      }

      if (ob.patientId !== dep.patientId || ob.practice !== dep.practice) {
        return reply.status(400).send({
          success: false,
          error: 'خدمت انتخاب‌شده متعلق به بیمار و مطب این بیعانه نیست.'
        });
      }

      // Calculate live remaining debt on this obligation
      const linkedReceipts = db.select().from(paymentReceipts).where(eq(paymentReceipts.obligationId, ob.id)).all();
      const paidSoFar = linkedReceipts.reduce((sum, r) => sum + r.paidAmount, 0);
      const remainingDebt = Math.max(0, (ob.totalCost - ob.discount) - paidSoFar);

      if (remainingDebt <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'این خدمت قبلاً بهطور کامل تسویه شده است.'
        });
      }

      const applyAmt = Math.min(dep.remainingAmount, remainingDebt, amount || dep.remainingAmount);
      if (applyAmt <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'مبلغ قابل تخصیص نامعتبر است.'
        });
      }

      const todayStr = getTodayJalaliStr();
      const timeStr = getCurrentTimestamp();

      let currentHistory: any[] = [];
      try {
        currentHistory = JSON.parse(dep.history || '[]');
      } catch {
        currentHistory = [];
      }

      sqlite.transaction(() => {
        // Find initial receipt for deposit
        const initReceipt = db.select().from(paymentReceipts).where(eq(paymentReceipts.id, dep.paymentReceiptId || '')).get();

        if (initReceipt && !initReceipt.obligationId && applyAmt === dep.initialAmount) {
          // 100% of initial receipt allocated: link it directly
          db.update(paymentReceipts).set({
            obligationId: ob.id,
            serviceDate: ob.serviceDate
          }).where(eq(paymentReceipts.id, initReceipt.id)).run();
        } else {
          // If partial or split: create an application tracking receipt linked to obligation
          const allocReceiptId = `alloc-${dep.id}-${Date.now()}`;
          db.insert(paymentReceipts).values({
            id: allocReceiptId,
            obligationId: ob.id,
            patientId: dep.patientId,
            appointmentId: ob.appointmentId || dep.appointmentId || null,
            practice: dep.practice,
            recordDate: todayStr,
            serviceDate: ob.serviceDate,
            paidAmount: applyAmt,
            paymentMethod: dep.paymentMethod,
            paymentAccountId: dep.paymentAccountId || null,
            posAccount: `تخصیص بیعانه (${dep.posAccount || 'صندوق'})`,
            timestamp: timeStr,
            notes: `اعمال مبلغ ${applyAmt.toLocaleString('fa-IR')} تومان بیعانه روی خدمت ${ob.serviceName}`,
            depositId: dep.id,
            receiptType: 'deposit_allocation'
          }).run();

          // And offset on unapplied receipt if needed, or link
          if (initReceipt && !initReceipt.obligationId) {
            // mark initial receipt as deposit
            db.update(paymentReceipts).set({
              paidAmount: Math.max(0, initReceipt.paidAmount - applyAmt)
            }).where(eq(paymentReceipts.id, initReceipt.id)).run();
          }
        }

        const newRemaining = dep.remainingAmount - applyAmt;
        const newStatus = newRemaining === 0 ? 'applied' : 'partially_applied';

        currentHistory.push({
          action: 'applied',
          timestamp: timeStr,
          date: todayStr,
          amount: applyAmt,
          details: `اعمال مبلغ ${applyAmt.toLocaleString('fa-IR')} تومان بیعانه روی خدمت «${ob.serviceName}» (شناسه ${ob.id})`
        });

        db.update(deposits).set({
          remainingAmount: newRemaining,
          status: newStatus,
          serviceObligationId: ob.id,
          history: JSON.stringify(currentHistory)
        }).where(eq(deposits.id, id)).run();
      })();

      const updated = getFormattedDepositById(id);
      return reply.send({
        success: true,
        data: updated
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'خطا در اعمال بیعانه روی خدمت'
      });
    }
  });
}
