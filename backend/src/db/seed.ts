import { db, sqlite } from '../config/database';
import * as schema from './schema/index';
import { toStandardJalaliDbDate } from '../utils/dateUtils';

// Import seed data from frontend mockData.ts without mutating frontend
import {
  initialDoctors,
  initialServices,
  initialPatients,
  initialAppointments,
  initialOnlineRequests,
  initialTransactions,
  initialFollowUps,
  initialExpenses,
  initialPaymentAccounts,
  initialGlobalShifts
} from '../../../src/data/mockData';

export function runSeed() {
  console.log('[Seed] Starting database seeding...');

  // Use a database transaction for atomic seeding
  sqlite.transaction(() => {
    // 1. Seed Global Settings (Shifts)
    db.insert(schema.clinicSettings)
      .values({
        key: 'global_shifts',
        value: JSON.stringify(initialGlobalShifts)
      })
      .onConflictDoNothing()
      .run();

    // 2. Seed Doctors & Schedules
    for (const doc of initialDoctors) {
      db.insert(schema.doctors)
        .values({
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty,
          practice: doc.practice,
          phone: doc.phone,
          avatar: doc.avatar || null,
          workingHours: doc.workingHours || null,
          color: doc.color
        })
        .onConflictDoNothing()
        .run();

      if (doc.weeklySchedule && doc.weeklySchedule.length > 0) {
        for (const sched of doc.weeklySchedule) {
          db.insert(schema.doctorSchedules)
            .values({
              doctorId: doc.id,
              day: sched.day,
              morningActive: sched.morningActive,
              eveningActive: sched.eveningActive
            })
            .onConflictDoNothing()
            .run();
        }
      }
    }

    // 3. Seed Payment Accounts
    for (const acc of initialPaymentAccounts) {
      db.insert(schema.paymentAccounts)
        .values({
          id: acc.id,
          name: acc.name,
          practice: acc.practice
        })
        .onConflictDoNothing()
        .run();
    }

    // 4. Seed Services
    for (const srv of initialServices) {
      db.insert(schema.services)
        .values({
          id: srv.id,
          name: srv.name,
          code: srv.code,
          practice: srv.practice,
          price: srv.price,
          duration: srv.duration,
          description: srv.description || null,
          defaultPaymentTermDays: srv.defaultPaymentTermDays || 10,
          active: srv.active
        })
        .onConflictDoNothing()
        .run();
    }

    // 5. Seed Patients & Memberships
    for (const pat of initialPatients) {
      db.insert(schema.patients)
        .values({
          id: pat.id,
          fileNumber: pat.fileNumber || null,
          nationalId: pat.nationalId || null,
          name: pat.name,
          mobile: pat.mobile,
          gender: pat.gender || null,
          birthDate: toStandardJalaliDbDate(pat.birthDate) || null,
          primaryPractice: pat.primaryPractice || null,
          allergies: pat.allergies ? JSON.stringify(pat.allergies) : null,
          medicalNotes: pat.medicalNotes || null,
          emergencyContact: pat.emergencyContact ? JSON.stringify(pat.emergencyContact) : null,
          profileStatus: pat.profileStatus || 'completed',
          username: pat.loginCredentials?.username || null,
          password: pat.loginCredentials?.password || null,
          createdAt: toStandardJalaliDbDate(pat.createdAt) || '1405-01-01'
        })
        .onConflictDoNothing()
        .run();

      if (pat.memberships && pat.memberships.length > 0) {
        for (const mem of pat.memberships) {
          db.insert(schema.patientPracticeMemberships)
            .values({
              patientId: pat.id,
              practice: mem.practice,
              physicalFileNumber: mem.physicalFileNumber,
              joinedAt: toStandardJalaliDbDate(mem.joinedAt) || toStandardJalaliDbDate(pat.createdAt) || '1405-01-01'
            })
            .onConflictDoNothing()
            .run();
        }
      }
    }

    // 6. Seed Appointments
    for (const apt of initialAppointments) {
      db.insert(schema.appointments)
        .values({
          id: apt.id,
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          serviceId: apt.serviceId || null,
          practice: apt.practice,
          date: toStandardJalaliDbDate(apt.date),
          timeSlot: apt.timeSlot,
          duration: apt.duration,
          status: apt.status,
          presenceStatus: apt.presenceStatus || null,
          notes: apt.notes || null,
          cabinetNumber: apt.cabinetNumber || null,
          cancellationReason: apt.cancellationReason || null,
          cancellationType: apt.cancellationType || null,
          canceledAt: toStandardJalaliDbDate(apt.canceledAt) || null,
          previousAppointmentId: apt.previousAppointmentId || null,
          replacementAppointmentId: apt.replacementAppointmentId || null
        })
        .onConflictDoNothing()
        .run();
    }

    // 7. Seed Financial Obligations & Payment Receipts
    for (const trx of initialTransactions) {
      const isPaymentOnly = trx.trxType === 'payment';
      const obligationId = trx.obligationId || `ob-${trx.id}`;

      if (!isPaymentOnly) {
        // Create Financial Obligation
        db.insert(schema.financialObligations)
          .values({
            id: obligationId,
            patientId: trx.patientId,
            appointmentId: trx.appointmentId || null,
            serviceId: undefined,
            practice: trx.practice,
            serviceDate: toStandardJalaliDbDate(trx.serviceDate || trx.date),
            recordDate: toStandardJalaliDbDate(trx.date),
            serviceName: trx.serviceName,
            totalCost: trx.totalCost || 0,
            discount: trx.discount || 0,
            netCost: trx.netCost || 0,
            dueDate: toStandardJalaliDbDate(trx.debtDueDate) || null,
            notes: trx.notes || null
          })
          .onConflictDoNothing()
          .run();
      }

      // Create Payment Receipt if paidAmount > 0 or trxType === 'payment'
      if (trx.paidAmount > 0 || isPaymentOnly) {
        // Find matching payment account ID
        const matchedAccount = initialPaymentAccounts.find((acc: { name: string; id: string }) => acc.name === trx.posAccount);

        db.insert(schema.paymentReceipts)
          .values({
            id: isPaymentOnly ? trx.id : `pay-${trx.id}`,
            obligationId: obligationId,
            patientId: trx.patientId,
            appointmentId: trx.appointmentId || null,
            practice: trx.practice,
            recordDate: toStandardJalaliDbDate(trx.date),
            serviceDate: toStandardJalaliDbDate(trx.serviceDate || trx.date),
            paidAmount: trx.paidAmount || 0,
            paymentMethod: trx.paymentMethod || 'cash',
            paymentAccountId: matchedAccount?.id || null,
            posAccount: trx.posAccount || null,
            timestamp: trx.timestamp || '12:00',
            debtDueDate: toStandardJalaliDbDate(trx.debtDueDate) || null,
            notes: trx.notes || null
          })
          .onConflictDoNothing()
          .run();
      }
    }

    // 8. Seed Follow-Up Tasks
    for (const flw of initialFollowUps) {
      db.insert(schema.followUpTasks)
        .values({
          id: flw.id,
          patientId: flw.patientId,
          doctorId: flw.doctorId,
          practice: flw.practice,
          type: flw.type,
          description: flw.description,
          dueDate: toStandardJalaliDbDate(flw.dueDate),
          status: flw.status,
          resultNote: flw.resultNote || null,
          updatedAt: flw.updatedAt || null
        })
        .onConflictDoNothing()
        .run();
    }

    // 9. Seed Expenses
    for (const exp of initialExpenses) {
      db.insert(schema.expenses)
        .values({
          id: exp.id,
          title: exp.title,
          category: exp.category,
          amount: exp.amount,
          date: toStandardJalaliDbDate(exp.date),
          practice: exp.practice,
          recordedBy: exp.recordedBy,
          description: exp.description || null,
          receiptNumber: exp.receiptNumber || null
        })
        .onConflictDoNothing()
        .run();
    }

    // 10. Seed Online Requests
    for (const req of initialOnlineRequests) {
      db.insert(schema.onlineRequests)
        .values({
          id: req.id,
          patientName: req.patientName,
          mobile: req.mobile,
          nationalId: req.nationalId || null,
          targetPractice: req.targetPractice,
          doctorId: req.doctorId,
          requestedDate: toStandardJalaliDbDate(req.requestedDate),
          requestedTimeSlot: req.requestedTimeSlot,
          requestType: req.requestType || 'visit',
          proposedDates: req.proposedDates ? JSON.stringify(req.proposedDates) : null,
          notes: req.notes || null,
          status: req.status,
          rejectionReason: req.rejectionReason || null,
          rejectedAt: toStandardJalaliDbDate(req.rejectedAt) || null,
          createdAt: req.createdAt
        })
        .onConflictDoNothing()
        .run();
    }
  })();

  console.log('[Seed] Database seeding completed successfully.');
}

if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  try {
    runSeed();
  } catch (error) {
    console.error('[Seed Error] Seeding failed:', error);
    process.exit(1);
  }
}
