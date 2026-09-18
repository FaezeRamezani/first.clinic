import { db, sqlite } from '../config/database';
import * as schema from './schema/index';

// Import ONLY base master data definitions
import {
  initialDoctors,
  initialServices,
  initialPaymentAccounts,
  initialGlobalShifts
} from '../../../src/data/mockData';

export function runSeed() {
  console.log('[Seed] Starting Base Data seeding...');

  // Use a database transaction for atomic seeding
  sqlite.transaction(() => {
    // 1. Seed Global Settings (Shifts & Expense Categories)
    db.insert(schema.clinicSettings)
      .values({
        key: 'global_shifts',
        value: JSON.stringify(initialGlobalShifts)
      })
      .onConflictDoNothing()
      .run();

    const initialExpenseCategories = [
      { id: 'consumables', name: 'مواد مصرفی' },
      { id: 'rent', name: 'اجاره و رهن' },
      { id: 'salaries', name: 'حقوق پرسنل' },
      { id: 'equipment', name: 'تجهیزات و تعمیرات' },
      { id: 'utilities', name: 'قبوض و نگهداری' },
      { id: 'other', name: 'متفرقه' }
    ];

    db.insert(schema.clinicSettings)
      .values({
        key: 'expense_categories',
        value: JSON.stringify(initialExpenseCategories)
      })
      .onConflictDoNothing()
      .run();

    // 2. Seed Doctors & Weekly Schedules
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

    // 4. Seed Base Services
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
  })();

  console.log('[Seed] Base Data seeding completed successfully.');
}

if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  try {
    runSeed();
  } catch (error) {
    console.error('[Seed Error] Base Data seeding failed:', error);
    process.exit(1);
  }
}
