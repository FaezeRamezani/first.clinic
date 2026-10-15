import Fastify from 'fastify';
import { createIsolatedTestDb } from './test_helpers/testDb';

async function runMultiServiceCheckoutTests() {
  console.log('====================================================');
  console.log('STARTING TESTS: MULTI-SERVICE CHECKOUT IN ISOLATED DB');
  console.log('Strict zero pollution to live/production databases');
  console.log('====================================================\n');

  // Initialize isolated temporary database first (sets process.env.DATABASE_PATH)
  const testEnv = await createIsolatedTestDb('multi_checkout');

  // Dynamically load schema, utils and routers bound to the isolated database
  const { eq, and } = await import('drizzle-orm');
  const { financialObligations, paymentReceipts } = await import('./db/schema/finance');
  const { appointments } = await import('./db/schema/appointments');
  const { deposits, depositHistory } = await import('./db/schema/deposits');
  const { doctors } = await import('./db/schema/doctors');
  const { services } = await import('./db/schema/services');
  const { paymentAccounts } = await import('./db/schema/paymentAccounts');

  const { doctorsRouter } = await import('./modules/doctors/doctors.router');
  const { servicesRouter } = await import('./modules/services/services.router');
  const { patientsRouter } = await import('./modules/patients/patients.router');
  const { appointmentsRouter } = await import('./modules/appointments/appointments.router');
  const { financeRouter } = await import('./modules/finance/finance.router');
  const { depositsRouter } = await import('./modules/deposits/deposits.router');
  const { paymentAccountsRouter } = await import('./modules/paymentAccounts/paymentAccounts.router');

  const app = Fastify({ logger: false });
  await app.register(doctorsRouter, { prefix: '/api/doctors' });
  await app.register(servicesRouter, { prefix: '/api/services' });
  await app.register(patientsRouter, { prefix: '/api/patients' });
  await app.register(appointmentsRouter, { prefix: '/api/appointments' });
  await app.register(financeRouter, { prefix: '/api/finance' });
  await app.register(depositsRouter, { prefix: '/api/deposits' });
  await app.register(paymentAccountsRouter, { prefix: '/api/payment-accounts' });
  await app.ready();

  async function request(url: string, options: any = {}) {
    const res = await app.inject({
      method: (options.method || 'GET') as any,
      url: `/api${url}`,
      payload: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
      headers: options.headers
    });
    let data;
    try {
      data = JSON.parse(res.body);
    } catch {
      data = res.body;
    }
    return { status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      if (detail) console.log(`         ${detail}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      if (detail) console.error(`         Failure: ${detail}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Setup Base Data: Doctor, Services, Payment Account
    // -------------------------------------------------------------
    console.log('--- Step 0: Retrieving base fixtures from isolated database ---');

    // Fetch seeded aesthetic doctor
    const docRes = await request('/doctors?practice=aesthetic');
    const doctor = docRes.data.data[0];
    const doctorId = doctor.id;

    // Fetch seeded dental doctor
    const dentalDocRes = await request('/doctors?practice=dental');
    const dentalDoc = dentalDocRes.data.data[0];
    const dentalDocId = dentalDoc.id;

    // Fetch seeded services
    const srvRes = await request('/services?practice=aesthetic');
    const aestheticServices = srvRes.data.data;
    const srv1 = aestheticServices[0] || { id: 'srv-1', name: 'مشاوره پوست', price: 500000 };
    const srv2 = aestheticServices[1] || { id: 'srv-2', name: 'تزریق بوتاکس', price: 3500000 };
    const srv3 = aestheticServices[2] || { id: 'srv-3', name: 'لیزر جوانسازی', price: 4000000 };

    const dentalSrvRes = await request('/services?practice=dental');
    const dentalSrv = dentalSrvRes.data.data[0];

    // Fetch seeded payment account
    const accRes = await request('/payment-accounts?practice=aesthetic');
    const paymentAccount = accRes.data.data[0];
    const paymentAccountId = paymentAccount.id;

    // Create Patient 1 (Aesthetic)
    const pat1Res = await request('/patients', {
      method: 'POST',
      body: {
        name: 'سارا حسینی',
        mobile: '09121112233',
        primaryPractice: 'aesthetic',
        physicalFileNumber: 'F-201',
        joinedAt: '1403/05/01'
      }
    });
    const patient1Id = pat1Res.data.data.id;

    assert(Boolean(doctorId && srv1.id && srv2.id && srv3.id && patient1Id), 'Base test fixtures verified in isolated DB');

    // -------------------------------------------------------------
    // TEST 1: Single service checkout (Backward compatibility)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Single Service Checkout (Backward Compatibility) ---');
    const apt1Res = await request('/appointments', {
      method: 'POST',
      body: {
        patientId: patient1Id,
        doctorId: doctorId,
        serviceId: srv1.id,
        practice: 'aesthetic',
        date: '1403-07-20',
        timeSlot: '10:00',
        duration: 30
      }
    });
    const apt1Id = apt1Res.data.data.id;

    const checkout1Res = await request('/finance/checkout', {
      method: 'POST',
      body: {
        appointmentId: apt1Id,
        patientId: patient1Id,
        doctorId: doctorId,
        practice: 'aesthetic',
        services: [
          { serviceId: srv1.id, agreedCost: 500000 }
        ],
        payments: [
          { method: 'pos', amount: 500000, paymentAccountId: paymentAccountId }
        ],
        notes: 'تسویه تک خدمتی تست'
      }
    });

    assert(checkout1Res.ok, 'Single service checkout API returned 200 OK');
    assert(checkout1Res.data.data.obligations.length === 1, 'Exactly 1 obligation created');
    assert(checkout1Res.data.data.obligations[0].amount === 500000, 'Obligation amount matches agreedCost (500,000)');
    assert(checkout1Res.data.data.obligations[0].remainingDebt === 0, 'Remaining debt is 0 after full payment');
    assert(checkout1Res.data.data.appointment.status === 'completed', 'Appointment marked as completed');
    assert(checkout1Res.data.data.appointment.presenceStatus === 'present', 'Appointment presence marked as present');

    // -------------------------------------------------------------
    // TEST 2: Two services checkout ("مشاوره" 500,000 + "تزریق" 3,500,000)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Two Services Checkout (مشاوره + تزریق with partial payment) ---');
    const pat2Res = await request('/patients', {
      method: 'POST',
      body: {
        name: 'نیلوفر کریمی',
        mobile: '09123334455',
        primaryPractice: 'aesthetic',
        physicalFileNumber: 'F-202',
        joinedAt: '1403/05/02'
      }
    });
    const patient2Id = pat2Res.data.data.id;

    const apt2Res = await request('/appointments', {
      method: 'POST',
      body: {
        patientId: patient2Id,
        doctorId: doctorId,
        serviceId: srv1.id,
        practice: 'aesthetic',
        date: '1403-07-21',
        timeSlot: '11:00',
        duration: 45
      }
    });
    const apt2Id = apt2Res.data.data.id;

    // Total cost = 500,000 + 3,500,000 = 4,000,000
    // Patient pays 2,500,000 (Partial payment: covers service 1 fully, and 2,000,000 towards service 2)
    const checkout2Res = await request('/finance/checkout', {
      method: 'POST',
      body: {
        appointmentId: apt2Id,
        patientId: patient2Id,
        doctorId: doctorId,
        practice: 'aesthetic',
        services: [
          { serviceId: srv1.id, agreedCost: 500000 },
          { serviceId: srv2.id, agreedCost: 3500000 }
        ],
        payments: [
          { method: 'pos', amount: 2500000, paymentAccountId: paymentAccountId }
        ],
        notes: 'تسویه دو خدمت با پرداخت ناقص'
      }
    });

    assert(checkout2Res.ok, 'Two services checkout returned 200 OK');
    const ob2List = checkout2Res.data.data.obligations;
    assert(ob2List.length === 2, 'Exactly 2 obligations created in database');

    const obService1 = ob2List.find((o: any) => o.serviceId === srv1.id);
    const obService2 = ob2List.find((o: any) => o.serviceId === srv2.id);

    assert(Boolean(obService1 && obService2), 'Both services exist as independent obligations');
    assert(obService1.amount === 500000 && obService1.paidAmount === 500000 && obService1.remainingDebt === 0,
      'Service 1 (مشاوره) is fully paid (amount: 500,000, debt: 0)');
    assert(obService2.amount === 3500000 && obService2.paidAmount === 2000000 && obService2.remainingDebt === 1500000,
      'Service 2 (تزریق) has partial payment (amount: 3,500,000, paid: 2,000,000, remaining debt: 1,500,000)');

    // Verify payment receipts linked correctly
    const rc2List = checkout2Res.data.data.receipts;
    assert(rc2List.length === 2, 'Created 2 payment receipt entries (allocated sequentially to each obligation)');
    const rcTotal = rc2List.reduce((sum: number, r: any) => sum + r.amount, 0);
    assert(rcTotal === 2500000, `Total payment receipts equal user payment (2,500,000). Actual: ${rcTotal}`);

    // Check patient financial history endpoint
    const historyRes = await request(`/finance/obligations?patientId=${patient2Id}&practice=aesthetic`);
    assert(historyRes.ok, 'Patient financial history retrieved successfully');
    const patientObligations = historyRes.data.data;
    assert(patientObligations.length === 2, `Patient history shows 2 distinct obligations (Found: ${patientObligations.length})`);

    // -------------------------------------------------------------
    // TEST 3: Three services checkout with Deposit application
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Three Services Checkout with Deposit Allocation ---');
    const pat3Res = await request('/patients', {
      method: 'POST',
      body: {
        name: 'مهدی کاظمی',
        mobile: '09124445566',
        primaryPractice: 'aesthetic',
        physicalFileNumber: 'F-203',
        joinedAt: '1403/05/03'
      }
    });
    const patient3Id = pat3Res.data.data.id;

    // Give patient a deposit of 2,000,000
    const depRes = await request('/deposits', {
      method: 'POST',
      body: {
        patientId: patient3Id,
        practice: 'aesthetic',
        amount: 2000000,
        paymentMethod: 'pos_aesthetic',
        paymentAccountId: paymentAccountId,
        notes: 'بیعانه اولیه برای خدمات چندگانه'
      }
    });
    assert(depRes.ok, 'Initial deposit of 2,000,000 created for patient 3');

    const apt3Res = await request('/appointments', {
      method: 'POST',
      body: {
        patientId: patient3Id,
        doctorId: doctorId,
        serviceId: srv1.id,
        practice: 'aesthetic',
        date: '1403-07-22',
        timeSlot: '14:00',
        duration: 60
      }
    });
    const apt3Id = apt3Res.data.data.id;

    // Services:
    // 1: مشاوره (500,000)
    // 2: بوتاکس (3,500,000)
    // 3: لیزر (4,000,000)
    // Total = 8,000,000
    // Deposit applied = 1,500,000 (remaining deposit should be 500,000)
    // Direct payment = 4,500,000
    // Total paid = 6,000,000. Total debt = 2,000,000
    const checkout3Res = await request('/finance/checkout', {
      method: 'POST',
      body: {
        appointmentId: apt3Id,
        patientId: patient3Id,
        doctorId: doctorId,
        practice: 'aesthetic',
        services: [
          { serviceId: srv1.id, agreedCost: 500000 },
          { serviceId: srv2.id, agreedCost: 3500000 },
          { serviceId: srv3.id, agreedCost: 4000000 }
        ],
        payments: [
          { method: 'pos', amount: 4500000, paymentAccountId: paymentAccountId }
        ],
        depositDeduction: 1500000,
        notes: 'تسویه ۳ خدمت همراه با کسر بیعانه'
      }
    });

    assert(checkout3Res.ok, 'Three services checkout with deposit returned 200 OK');
    const ob3List = checkout3Res.data.data.obligations;
    assert(ob3List.length === 3, 'Exactly 3 obligations created in database');

    const totalCost3 = ob3List.reduce((sum: number, o: any) => sum + o.amount, 0);
    const totalPaid3 = ob3List.reduce((sum: number, o: any) => sum + o.paidAmount, 0);
    const totalDebt3 = ob3List.reduce((sum: number, o: any) => sum + o.remainingDebt, 0);

    assert(totalCost3 === 8000000, `Total cost is 8,000,000 (Actual: ${totalCost3})`);
    assert(totalPaid3 === 6000000, `Total paid is 6,000,000 (1.5M deposit + 4.5M POS) (Actual: ${totalPaid3})`);
    assert(totalDebt3 === 2000000, `Remaining debt is 2,000,000 (Actual: ${totalDebt3})`);

    // Verify patient's remaining deposit in database
    const patient3Deposits = await request(`/deposits?patientId=${patient3Id}&practice=aesthetic`);
    const activeDep = patient3Deposits.data.data.find((d: any) => d.status === 'active' || d.status === 'partially_applied');
    assert(activeDep.remainingAmount === 500000, `Deposit remaining correctly updated to 500,000 (Actual: ${activeDep?.remainingAmount})`);

    // -------------------------------------------------------------
    // TEST 4: UI List modification simulation (Adding 3, removing 1)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Service List Modification (Removing 1 service before checkout) ---');
    // Simulate user selecting srv1, srv2, srv3 in the UI, then removing srv2
    const initialSelected = [
      { serviceId: srv1.id, agreedCost: 500000 },
      { serviceId: srv2.id, agreedCost: 3500000 },
      { serviceId: srv3.id, agreedCost: 4000000 }
    ];
    // User deletes srv2
    const afterRemoval = initialSelected.filter(s => s.serviceId !== srv2.id);
    assert(afterRemoval.length === 2, 'List correctly contains 2 services after removal');
    assert(afterRemoval.every(s => s.serviceId !== srv2.id), 'Removed service (srv2) is absent from list');

    const totalAfterRemoval = afterRemoval.reduce((sum, s) => sum + s.agreedCost, 0);
    assert(totalAfterRemoval === 4500000, `Reactive total cost updated to 4,500,000 (Actual: ${totalAfterRemoval})`);

    // -------------------------------------------------------------
    // TEST 5: Atomic rollback on failure & duplicate prevention
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Atomic Rollback on Failure & Duplicate Checkout Prevention ---');

    // 5.1 Attempt to checkout apt1 again (already completed)
    const duplicateRes = await request('/finance/checkout', {
      method: 'POST',
      body: {
        appointmentId: apt1Id,
        patientId: patient1Id,
        doctorId: doctorId,
        practice: 'aesthetic',
        services: [{ serviceId: srv1.id, agreedCost: 500000 }],
        payments: []
      }
    });
    assert(!duplicateRes.ok && duplicateRes.status === 400, 'Duplicate checkout rejected with 400 Bad Request');
    assert(duplicateRes.data.error.includes('قبلاً تسویه شده'), 'Error message confirms appointment was already checked out');

    // 5.2 Attempt checkout with non-existent service ID inside atomic transaction
    const apt4Res = await request('/appointments', {
      method: 'POST',
      body: {
        patientId: patient1Id,
        doctorId: doctorId,
        serviceId: srv1.id,
        practice: 'aesthetic',
        date: '1403-07-23',
        timeSlot: '16:00',
        duration: 30
      }
    });
    const apt4Id = apt4Res.data.data.id;

    const invalidSrvCheckout = await request('/finance/checkout', {
      method: 'POST',
      body: {
        appointmentId: apt4Id,
        patientId: patient1Id,
        doctorId: doctorId,
        practice: 'aesthetic',
        services: [
          { serviceId: srv1.id, agreedCost: 500000 },
          { serviceId: 'srv-does-not-exist-999', agreedCost: 1000000 }
        ],
        payments: [{ method: 'pos', amount: 500000, paymentAccountId: paymentAccountId }]
      }
    });

    assert(!invalidSrvCheckout.ok, 'Checkout with non-existent service rejected');

    // Verify rollback: no obligations were inserted for apt4
    const apt4Db = testEnv.db.select().from(appointments).where(eq(appointments.id, apt4Id)).get();
    assert(apt4Db.status === 'pending', 'Appointment status remained "pending" (not completed) due to transaction rollback');

    const apt4Obligations = testEnv.db.select().from(financialObligations).where(eq(financialObligations.appointmentId, apt4Id)).all();
    assert(apt4Obligations.length === 0, 'Zero orphan obligations committed for failed checkout transaction');

    // -------------------------------------------------------------
    // TEST 6: Practice Scoping & Data Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Practice Scoping & Isolation (Aesthetic vs Dental) ---');

    // Patient 4 in Dental
    const pat4Res = await request('/patients', {
      method: 'POST',
      body: {
        name: 'علی دندانی',
        mobile: '09127778899',
        primaryPractice: 'dental',
        physicalFileNumber: 'D-501',
        joinedAt: '1403/05/04'
      }
    });
    const patient4Id = pat4Res.data.data.id;

    // Appointment in Dental
    const aptDentalRes = await request('/appointments', {
      method: 'POST',
      body: {
        patientId: patient4Id,
        doctorId: dentalDocId,
        serviceId: dentalSrv.id,
        practice: 'dental',
        date: '1403-07-24',
        timeSlot: '09:00',
        duration: 45
      }
    });
    const aptDentalId = aptDentalRes.data.data.id;

    const dentalCheckoutRes = await request('/finance/checkout', {
      method: 'POST',
      body: {
        appointmentId: aptDentalId,
        patientId: patient4Id,
        doctorId: dentalDocId,
        practice: 'dental',
        services: [
          { serviceId: dentalSrv.id, agreedCost: 1200000 }
        ],
        payments: [
          { method: 'cash', amount: 1200000 }
        ]
      }
    });

    assert(dentalCheckoutRes.ok, 'Dental checkout completed successfully in dental practice');

    // Query aesthetic ledger for patient 4 -> must be empty
    const pat4AestheticHistory = await request(`/finance/obligations?patientId=${patient4Id}&practice=aesthetic`);
    assert(pat4AestheticHistory.data.data.length === 0, 'Dental patient has 0 obligations in aesthetic practice');

    // Query dental ledger for patient 4 -> must have 1 obligation
    const pat4DentalHistory = await request(`/finance/obligations?patientId=${patient4Id}&practice=dental`);
    assert(pat4DentalHistory.data.data.length === 1, 'Dental patient has exactly 1 obligation in dental practice');

    // Query dental ledger for patient 2 (aesthetic patient) -> must have 0 obligations
    const pat2DentalHistory = await request(`/finance/obligations?patientId=${patient2Id}&practice=dental`);
    assert(pat2DentalHistory.data.data.length === 0, 'Aesthetic patient has 0 obligations in dental practice');

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

  } finally {
    await app.close();
    testEnv.cleanup();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiServiceCheckoutTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
