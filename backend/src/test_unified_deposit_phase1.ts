import Fastify from 'fastify';
import { createIsolatedTestDb } from './test_helpers/testDb';

function getData(res: any) {
  const parsed = JSON.parse(res.body);
  return parsed.data !== undefined ? parsed.data : parsed;
}

function getRandomMobile() {
  return `0912${Math.floor(1000000 + Math.random() * 8999999)}`;
}

async function runPhase1Tests() {
  console.log('================================================================');
  console.log('   STARTING PHASE 1 MANDATORY TESTS: UNIFIED DEPOSIT & BALANCE   ');
  console.log('================================================================\n');

  // Initialize isolated temporary database
  const testEnv = await createIsolatedTestDb('phase1_unified');

  // Dynamically load routers bound to the isolated database
  const { patientsRouter } = await import('./modules/patients/patients.router');
  const { appointmentsRouter } = await import('./modules/appointments/appointments.router');
  const { financeRouter } = await import('./modules/finance/finance.router');
  const { depositsRouter } = await import('./modules/deposits/deposits.router');
  const { servicesRouter } = await import('./modules/services/services.router');

  const app = Fastify({ logger: false });
  await app.register(patientsRouter, { prefix: '/api/patients' });
  await app.register(appointmentsRouter, { prefix: '/api/appointments' });
  await app.register(financeRouter, { prefix: '/api/finance' });
  await app.register(depositsRouter, { prefix: '/api/deposits' });
  await app.register(servicesRouter, { prefix: '/api/services' });
  await app.ready();

  const results: { testNo: number; title: string; passed: boolean; details: string }[] = [];

  try {
    // -------------------------------------------------------------
    // Test 1: حساب صفر + دریافت ۵۰۰ هزار تومان = مانده مثبت ۵۰۰ هزار تومان
    // -------------------------------------------------------------
    const pt1Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'سارا محمدی رضایی',
        mobile: getRandomMobile(),
        primaryPractice: 'aesthetic'
      }
    });
    if (pt1Res.statusCode !== 201) {
      throw new Error(`Failed to create Patient 1: ${pt1Res.body}`);
    }
    const pt1 = getData(pt1Res);
    const balancePt1Initial = pt1.balance; // should be 0

    // Receive 500,000 as deposit
    const dep1Res = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt1.id,
        practice: 'aesthetic',
        amount: 500000,
        paymentDate: '1405-07-20',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });
    const dep1 = getData(dep1Res);

    const pt1AfterRes = await app.inject({ method: 'GET', url: `/api/patients/${pt1.id}` });
    const pt1After = getData(pt1AfterRes);

    const passed1 = balancePt1Initial === 0 && pt1After.balance === 500000;
    results.push({
      testNo: 1,
      title: 'حساب صفر + دریافت ۵۰۰ هزار تومان بیعانه = مانده مثبت ۵۰۰ هزار تومان (بستانکار)',
      passed: Boolean(passed1),
      details: passed1
        ? `تراز اولیه: ${balancePt1Initial}، تراز پس از بیعانه: ${pt1After.balance} (اعتبار مثبت ۵۰۰ هزار تومانی ثبت شد).`
        : `خطا: اولیه ${balancePt1Initial}، بعد ${pt1After.balance}`
    });

    // -------------------------------------------------------------
    // Test 2: بدهی منفی ۲ میلیون تومان + دریافت ۵۰۰ هزار تومان = مانده منفی ۱٫۵ میلیون تومان
    // -------------------------------------------------------------
    const pt2Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'مریم احمدی کاشانی',
        mobile: getRandomMobile(),
        primaryPractice: 'aesthetic'
      }
    });
    if (pt2Res.statusCode !== 201) {
      throw new Error(`Failed to create Patient 2: ${pt2Res.body}`);
    }
    const pt2 = getData(pt2Res);

    // Create an obligation of 2,000,000 with 0 payment (Debt = 2M, Balance = -2M)
    await app.inject({
      method: 'POST',
      url: '/api/finance/obligations',
      payload: {
        patientId: pt2.id,
        practice: 'aesthetic',
        serviceDate: '1405-07-01',
        recordDate: '1405-07-01',
        serviceName: 'تزریق فیلر',
        totalCost: 2000000,
        discount: 0,
        paidAmount: 0
      }
    });

    const pt2BeforeRes = await app.inject({ method: 'GET', url: `/api/patients/${pt2.id}` });
    const pt2Before = getData(pt2BeforeRes);

    // Patient pays 500,000 as deposit
    await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt2.id,
        practice: 'aesthetic',
        amount: 500000,
        paymentDate: '1405-07-15',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });

    const pt2AfterRes = await app.inject({ method: 'GET', url: `/api/patients/${pt2.id}` });
    const pt2After = getData(pt2AfterRes);

    const passed2 = pt2Before.balance === -2000000 && pt2After.balance === -1500000;
    results.push({
      testNo: 2,
      title: 'بدهی منفی ۲ میلیون تومان + دریافت ۵۰۰ هزار تومان = مانده منفی ۱٫۵ میلیون تومان',
      passed: Boolean(passed2),
      details: passed2
        ? `تراز قبل: ${pt2Before.balance}، تراز پس از دریافت: ${pt2After.balance} (بدهی مستقیماً ۵۰۰ هزار تومان کاهش یافت).`
        : `خطا: قبل ${pt2Before.balance}، بعد ${pt2After.balance}`
    });

    // -------------------------------------------------------------
    // Test 3: حساب صفر + دریافت مستقل ۲ میلیون تومان = مانده مثبت ۲ میلیون تومان بدون تعهد/خدمت
    // -------------------------------------------------------------
    const pt3Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'علی رضایی تهرانی',
        mobile: getRandomMobile(),
        primaryPractice: 'aesthetic'
      }
    });
    if (pt3Res.statusCode !== 201) {
      throw new Error(`Failed to create Patient 3: ${pt3Res.body}`);
    }
    const pt3 = getData(pt3Res);

    // Direct independent payment of 2,000,000 via /api/finance/payments
    const payRes3 = await app.inject({
      method: 'POST',
      url: '/api/finance/payments',
      payload: {
        patientId: pt3.id,
        practice: 'aesthetic',
        paidAmount: 2000000,
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی',
        notes: 'پیش‌پرداخت آزاد بیمار'
      }
    });

    const pt3AfterRes = await app.inject({ method: 'GET', url: `/api/patients/${pt3.id}` });
    const pt3After = getData(pt3AfterRes);

    // Verify obligations table has 0 records for pt3
    const obsPt3Res = await app.inject({ method: 'GET', url: `/api/finance/obligations?patientId=${pt3.id}` });
    const obsPt3 = getData(obsPt3Res);

    const passed3 = payRes3.statusCode === 201 &&
      pt3After.balance === 2000000 &&
      Array.isArray(obsPt3) &&
      obsPt3.length === 0;

    results.push({
      testNo: 3,
      title: 'حساب صفر + دریافت مستقل ۲ میلیون تومان = مانده مثبت ۲ میلیون تومان بدون ایجاد تعهد مالی',
      passed: Boolean(passed3),
      details: passed3
        ? `تراز بیمار: ${pt3After.balance} (بستانکار ۲ میلیون تومان)، تعداد تعهدات خدمت ایجاد شده: ${obsPt3.length}.`
        : `خطا: وضعیت پاسخ ${payRes3.statusCode}، تراز ${pt3After.balance}، تعهدات: ${obsPt3?.length}`
    });

    // -------------------------------------------------------------
    // Test 4: استرداد ۵۰۰ هزار تومان از اعتبار ۵۰۰ هزار تومانی، مانده را به صفر برساند
    // -------------------------------------------------------------
    // pt1 currently has balance +500,000 from dep1. Let's refund it.
    const refRes4 = await app.inject({
      method: 'POST',
      url: `/api/deposits/${dep1.id}/refund`,
      payload: {
        refundAmount: 500000,
        paymentMethod: 'card_transfer',
        posAccount: 'کارت به کارت بانک سامان',
        reason: 'انصراف بیمار'
      }
    });

    const pt1AfterRefundRes = await app.inject({ method: 'GET', url: `/api/patients/${pt1.id}` });
    const pt1AfterRefund = getData(pt1AfterRefundRes);

    const passed4 = refRes4.statusCode === 200 && pt1AfterRefund.balance === 0;
    results.push({
      testNo: 4,
      title: 'استرداد ۵۰۰ هزار تومان از اعتبار ۵۰۰ هزار تومانی و رسیدن مانده به صفر بدون دوباره‌شماری',
      passed: Boolean(passed4),
      details: passed4
        ? `تراز بیمار پس از استرداد کامل: ${pt1AfterRefund.balance} (حساب دقیقاً تسویه شد).`
        : `خطا: کد ${refRes4.statusCode}، مانده: ${pt1AfterRefund.balance}`
    });

    // -------------------------------------------------------------
    // Test 5: سوابق تخصیص بیعانه (Allocation) و عدم دوباره‌شماری در فرمول
    // -------------------------------------------------------------
    const pt5Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'رضا کریمی شیرازی',
        mobile: getRandomMobile(),
        primaryPractice: 'aesthetic'
      }
    });
    if (pt5Res.statusCode !== 201) {
      throw new Error(`Failed to create Patient 5: ${pt5Res.body}`);
    }
    const pt5 = getData(pt5Res);

    // Deposit of 1,500,000
    const dep5Res = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt5.id,
        practice: 'aesthetic',
        amount: 1500000,
        paymentDate: '1405-07-10',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });
    const dep5 = getData(dep5Res);

    // Balance now: +1,500,000
    const pt5BalAfterDep = getData(await app.inject({ method: 'GET', url: `/api/patients/${pt5.id}` })).balance;

    // Obligation of 1,000,000 created with applyDeposit of 1,000,000
    const ob5Res = await app.inject({
      method: 'POST',
      url: '/api/finance/obligations',
      payload: {
        patientId: pt5.id,
        practice: 'aesthetic',
        serviceDate: '1405-07-15',
        recordDate: '1405-07-15',
        serviceName: 'خدمت مزوتراپی',
        totalCost: 1000000,
        discount: 0,
        paidAmount: 0,
        depositId: dep5.id
      }
    });

    // Patient paid 1.5M deposit, rendered 1.0M service. Remaining deposit in dep5 is 500k.
    // Patient balance should be: +1,500,000 - 1,000,000 = +500,000.
    const pt5BalAfterAlloc = getData(await app.inject({ method: 'GET', url: `/api/patients/${pt5.id}` })).balance;

    // Verify finance summary totalIncome across receipts
    const summaryRes = await app.inject({ method: 'GET', url: `/api/finance/summary?patientId=${pt5.id}` });
    const summaryPt5 = getData(summaryRes);

    const passed5 = pt5BalAfterDep === 1500000 &&
      pt5BalAfterAlloc === 500000 &&
      summaryPt5.totalIncome === 1500000;

    results.push({
      testNo: 5,
      title: 'صحت مانده حساب در تخصیص بیعانه و عدم دوباره‌شماری سوابق تخصیص',
      passed: Boolean(passed5),
      details: passed5
        ? `تراز پس از بیعانه: ${pt5BalAfterDep}، تراز پس از خدمت ۱M و تخصیص: ${pt5BalAfterAlloc}، مجموع دریافتی در گزارش: ${summaryPt5.totalIncome}.`
        : `خطا: تراز بعد بیعانه ${pt5BalAfterDep}، بعد تخصیص ${pt5BalAfterAlloc}، گزارش ${summaryPt5?.totalIncome}`
    });

    // -------------------------------------------------------------
    // Test 6: ثبت دریافت نباید وضعیت نوبت را تغییر دهد یا تعهد خدمت بسازد
    // -------------------------------------------------------------
    const pt6Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'نرگس حسینی اصفهانی',
        mobile: getRandomMobile(),
        primaryPractice: 'aesthetic'
      }
    });
    if (pt6Res.statusCode !== 201) {
      throw new Error(`Failed to create Patient 6: ${pt6Res.body}`);
    }
    const pt6 = getData(pt6Res);

    const apt6Res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        patientId: pt6.id,
        doctorId: 'doc-1',
        practice: 'aesthetic',
        date: `1405-08-${(Date.now() % 25 + 1).toString().padStart(2, '0')}`,
        timeSlot: `${(Date.now() % 5 + 11).toString().padStart(2, '0')}:${(Date.now() % 50).toString().padStart(2, '0')}`,
        duration: 30,
        status: 'pending'
      }
    });
    const apt6 = getData(apt6Res);

    // Register deposit linked to this appointment
    await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt6.id,
        practice: 'aesthetic',
        appointmentId: apt6.id,
        amount: 800000,
        paymentDate: '1405-07-22',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });

    // Check appointment status: must STILL be 'pending', not completed!
    const apt6AfterRes = await app.inject({ method: 'GET', url: `/api/appointments` });
    const apt6After = getData(apt6AfterRes).find((a: any) => a.id === apt6.id);

    // Check obligations count: must be 0!
    const obsPt6 = getData(await app.inject({ method: 'GET', url: `/api/finance/obligations?patientId=${pt6.id}` }));

    const passed6 = apt6After &&
      apt6After.status === 'pending' &&
      Array.isArray(obsPt6) &&
      obsPt6.length === 0;

    results.push({
      testNo: 6,
      title: 'استقلال وضعیت نوبت و عدم ایجاد تعهد خدمت خودکار با ثبت دریافت',
      passed: Boolean(passed6),
      details: passed6
        ? `وضعیت نوبت در حالت '${apt6After.status}' باقی ماند و هیچ تعهد مالی ایجاد نشد (تعداد تعهدات: ${obsPt6.length}).`
        : `خطا: وضعیت نوبت ${apt6After?.status}، تعهدات: ${obsPt6?.length}`
    });

  } catch (err: any) {
    console.error('Test execution error:', err);
  } finally {
    await app.close();
    testEnv.cleanup();
  }

  console.log('\n================ PHASE 1 TEST SUMMARY ================');
  let allPass = true;
  for (const r of results) {
    const mark = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Test ${r.testNo}] ${r.title}\n      -> ${r.details}`);
    if (!r.passed) allPass = false;
  }
  console.log('======================================================');
  console.log(`TOTAL: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
  if (!allPass) {
    process.exit(1);
  }
}

runPhase1Tests();
