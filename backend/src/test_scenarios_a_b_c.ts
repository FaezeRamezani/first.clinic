
const API_BASE = 'http://127.0.0.1:3000/api';

async function request(url: string, options: any = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runValidationTests() {
  console.log('====================================================');
  console.log('STARTING TESTS: A, B, C AND DEPOSIT LINK REGRESSION');
  console.log('====================================================\n');

  // Find or create doctor and service
  const docsRes = await request('/doctors');
  const aestheticDoc = docsRes.data.data.find((d: any) => d.practice === 'aesthetic') || docsRes.data.data[0];

  const srvsRes = await request('/services');
  let targetService = srvsRes.data.data.find((s: any) => s.practice === 'aesthetic' && s.price === 3000000);
  if (!targetService) {
    // If no 3,000,000 service, pick one or create one
    targetService = srvsRes.data.data.find((s: any) => s.practice === 'aesthetic') || {
      id: 'srv-test-3m',
      name: 'خدمت تخصصی زیبایی ۳ میلیونی',
      price: 3000000
    };
  }

  // ===============================================================
  // TEST A: نوبت قبلی + بیعانه ناقص
  // ===============================================================
  console.log('--- TEST A: نوبت قبلی (خدمت ۳,۰۰۰,۰۰۰) + بیعانه ناقص (۵۰۰,۰۰۰) ---');
  const uniqueMobileA = `0911${Math.floor(1000000 + Math.random() * 9000000)}`;
  const patientARes = await request('/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'بیمار سناریوی الف',
      mobile: uniqueMobileA,
      primaryPractice: 'aesthetic'
    })
  });
  if (!patientARes.ok) throw new Error(`Failed to create Patient A: ${JSON.stringify(patientARes.data)}`);
  const patientA = patientARes.data.data;

  // 1. Create appointment for 3,000,000 service
  const aptDateA = '1405-02-15';
  const aptSlotA = `${10 + Math.floor(Math.random() * 5)}:${Math.floor(10 + Math.random() * 45)}`;
  const aptARes = await request('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientA.id,
      doctorId: aestheticDoc.id,
      serviceId: targetService.id,
      practice: 'aesthetic',
      date: aptDateA,
      timeSlot: aptSlotA,
      duration: 30,
      notes: 'نوبت تست الف'
    })
  });
  if (!aptARes.ok) throw new Error(`Failed to create Appointment A: ${JSON.stringify(aptARes.data)}`);
  const aptA = aptARes.data.data;

  // Check appointment before deposit
  console.log(`[A.1] نوبت اولیه ایجاد شد: شناسه ${aptA.id}، وضعیت: ${aptA.status}`);

  // 2. Register partial deposit 500,000 linked to this appointment
  const depARes = await request('/deposits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientA.id,
      practice: 'aesthetic',
      serviceId: targetService.id,
      appointmentId: aptA.id,
      amount: 500000,
      paymentDate: '1405-02-10',
      paymentMethod: 'pos_aesthetic',
      posAccount: 'کارتخوان زیبایی بانک سامان',
      notes: 'بیعانه ۵۰۰ هزار تومانی برای نوبت ۳ میلیونی'
    })
  });
  if (!depARes.ok) throw new Error(`Failed to create Deposit A: ${JSON.stringify(depARes.data)}`);
  const depA = depARes.data.data;

  console.log(`[A.2] بیعانه ثبت شد: شناسه ${depA.id}، مبلغ: ${depA.initialAmount}، متصل به نوبت: ${depA.appointmentId}`);

  // 3. Fetch fresh appointments and transactions
  const trxsRes = await request('/finance/transactions');
  const allTrxs = trxsRes.data.data;
  const aptsRes = await request('/appointments');
  const freshAptA = aptsRes.data.data.find((a: any) => a.id === aptA.id);

  // Evaluate UI dashboard logic for Apt A:
  const hasOb_OLD_LOGIC_A = allTrxs.some((t: any) => t.appointmentId === freshAptA.id);
  const hasOb_NEW_LOGIC_A = allTrxs.some((t: any) => t.appointmentId === freshAptA.id && t.trxType === 'service');

  const isCompleted_A = freshAptA.status === 'completed';
  const isSettledDisplay_A = hasOb_NEW_LOGIC_A || isCompleted_A;
  const isActionsEnabled_A = freshAptA.status !== 'completed' && 
                             freshAptA.status !== 'canceled' && 
                             freshAptA.status !== 'rescheduled' && 
                             !hasOb_NEW_LOGIC_A;

  // Simulate QuickCheckout calculation:
  const servicePrice = 3000000;
  const activeDepositRemaining = depA.remainingAmount;
  const depositDeduction = Math.min(activeDepositRemaining, servicePrice);
  const payableAfterDeposit = Math.max(0, servicePrice - depositDeduction);
  const remainingDebtSimulated = payableAfterDeposit; // If patient pays 0 now

  console.log(`[A.3] بررسی وضعیت پس از بیعانه:`);
  console.log(`      منطق قدیمی hasOb (غلط): ${hasOb_OLD_LOGIC_A}`);
  console.log(`      منطق اصلاح‌شده hasOb (صحیح): ${hasOb_NEW_LOGIC_A}`);
  console.log(`      وضعیت نوبت در دیتابیس: ${freshAptA.status}`);
  console.log(`      نمایش تسویه‌شده در داشبورد: ${isSettledDisplay_A ? 'بله ❌' : 'خیر ✅'}`);
  console.log(`      عملیات «تسویه» و «تغییر نوبت» فعال است: ${isActionsEnabled_A ? 'بله ✅' : 'خیر ❌'}`);
  console.log(`      هزینه خدمت: ${servicePrice} | کسر بیعانه: ${depositDeduction} | مانده بدهی قابل مشاهده: ${remainingDebtSimulated}`);

  const passedA = !hasOb_NEW_LOGIC_A && 
                  !isSettledDisplay_A && 
                  isActionsEnabled_A && 
                  freshAptA.status === 'pending' &&
                  remainingDebtSimulated === 2500000 &&
                  depA.appointmentId === aptA.id;
  console.log(`=> نتیجه تست A: ${passedA ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // ===============================================================
  // TEST B: ثبت بیعانه و ایجاد نوبت در مرحله ۴
  // ===============================================================
  console.log('--- TEST B: ثبت بیعانه و ایجاد همزمان نوبت در مرحله ۴ ---');
  const uniqueMobileB = `0912${Math.floor(1000000 + Math.random() * 9000000)}`;
  const patientBRes = await request('/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'بیمار سناریوی ب',
      mobile: uniqueMobileB,
      primaryPractice: 'aesthetic'
    })
  });
  if (!patientBRes.ok) throw new Error(`Failed to create Patient B: ${JSON.stringify(patientBRes.data)}`);
  const patientB = patientBRes.data.data;

  const aptDateB = '1405-02-20';
  const aptSlotB = `${11 + Math.floor(Math.random() * 4)}:${Math.floor(10 + Math.random() * 45)}`;

  // Create deposit with newAppointment (Step 4 of wizard)
  const depBRes = await request('/deposits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientB.id,
      practice: 'aesthetic',
      serviceId: targetService.id,
      amount: 500000,
      paymentDate: '1405-02-10',
      paymentMethod: 'pos_aesthetic',
      posAccount: 'کارتخوان زیبایی بانک سامان',
      notes: 'بیعانه ۵۰۰ هزار تومانی با ایجاد نوبت مرحله ۴',
      newAppointment: {
        date: aptDateB,
        timeSlot: aptSlotB,
        duration: 30,
        cabinetNumber: 'اتاق پوست ۱',
        notes: 'نوبت مرحله ۴'
      }
    })
  });
  if (!depBRes.ok) throw new Error(`Failed to create Deposit B with newAppointment: ${JSON.stringify(depBRes.data)}`);
  const depB = depBRes.data.data;

  const createdAptIdB = depB.appointmentId;
  console.log(`[B.1] بیعانه ثبت شد و نوبت جدید ایجاد گردید: شناسه نوبت: ${createdAptIdB}`);

  // Fetch created appointment and transactions
  const aptsResB = await request('/appointments');
  const freshAptB = aptsResB.data.data.find((a: any) => a.id === createdAptIdB);
  const trxsResB = await request('/finance/transactions');
  const allTrxsB = trxsResB.data.data;

  const hasOb_OLD_LOGIC_B = allTrxsB.some((t: any) => t.appointmentId === createdAptIdB);
  const hasOb_NEW_LOGIC_B = allTrxsB.some((t: any) => t.appointmentId === createdAptIdB && t.trxType === 'service');

  const isCompleted_B = freshAptB.status === 'completed';
  const isSettledDisplay_B = hasOb_NEW_LOGIC_B || isCompleted_B;
  const isActionsEnabled_B = freshAptB.status !== 'completed' && 
                             freshAptB.status !== 'canceled' && 
                             freshAptB.status !== 'rescheduled' && 
                             !hasOb_NEW_LOGIC_B;

  console.log(`[B.2] بررسی وضعیت نوبت مرحله ۴:`);
  console.log(`      منطق قدیمی hasOb (غلط): ${hasOb_OLD_LOGIC_B}`);
  console.log(`      منطق اصلاح‌شده hasOb (صحیح): ${hasOb_NEW_LOGIC_B}`);
  console.log(`      وضعیت نوبت در دیتابیس: ${freshAptB.status}`);
  console.log(`      نمایش تسویه‌شده در داشبورد: ${isSettledDisplay_B ? 'بله ❌' : 'خیر ✅'}`);
  console.log(`      عملیات «تسویه» و «تغییر نوبت» فعال است: ${isActionsEnabled_B ? 'بله ✅' : 'خیر ❌'}`);

  const passedB = !hasOb_NEW_LOGIC_B && 
                  !isSettledDisplay_B && 
                  isActionsEnabled_B && 
                  freshAptB.status === 'pending' &&
                  Boolean(createdAptIdB);
  console.log(`=> نتیجه تست B: ${passedB ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // ===============================================================
  // TEST C: نوبت عادی بدون بیعانه
  // ===============================================================
  console.log('--- TEST C: نوبت معمولی بدون بیعانه (بررسی عدم تغییر رفتار قبلی سیستم) ---');
  const uniqueMobileC = `0913${Math.floor(1000000 + Math.random() * 9000000)}`;
  const patientCRes = await request('/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'بیمار سناریوی ج',
      mobile: uniqueMobileC,
      primaryPractice: 'aesthetic'
    })
  });
  if (!patientCRes.ok) throw new Error(`Failed to create Patient C: ${JSON.stringify(patientCRes.data)}`);
  const patientC = patientCRes.data.data;

  const aptDateC = '1405-02-25';
  const aptSlotC = `${12 + Math.floor(Math.random() * 3)}:${Math.floor(10 + Math.random() * 45)}`;
  const aptCRes = await request('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientC.id,
      doctorId: aestheticDoc.id,
      serviceId: targetService.id,
      practice: 'aesthetic',
      date: aptDateC,
      timeSlot: aptSlotC,
      duration: 30,
      notes: 'نوبت تست ج بدون بیعانه'
    })
  });
  if (!aptCRes.ok) throw new Error(`Failed to create Appointment C: ${JSON.stringify(aptCRes.data)}`);
  const aptC = aptCRes.data.data;

  // Check state before checkout
  const trxsResCBefore = await request('/finance/transactions');
  const hasOb_C_Before = trxsResCBefore.data.data.some((t: any) => t.appointmentId === aptC.id && t.trxType === 'service');
  const isActionsEnabled_C_Before = !hasOb_C_Before && aptC.status === 'pending';

  console.log(`[C.1] نوبت بدون بیعانه: hasOb = ${hasOb_C_Before} | عملیات تسویه و تغییر نوبت فعال: ${isActionsEnabled_C_Before}`);

  // Now perform actual checkout for Appointment C
  const obCRes = await request('/finance/obligations', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientC.id,
      appointmentId: aptC.id,
      serviceId: targetService.id,
      practice: 'aesthetic',
      serviceDate: aptDateC,
      recordDate: aptDateC,
      serviceName: targetService.name,
      totalCost: 3000000,
      discount: 0,
      paidAmount: 3000000,
      paymentMethod: 'pos_aesthetic',
      posAccount: 'کارتخوان زیبایی بانک سامان',
      notes: 'تسویه کامل نوبت عادی'
    })
  });
  if (!obCRes.ok) throw new Error(`Failed to create Obligation C: ${JSON.stringify(obCRes.data)}`);

  // Check state after checkout
  const trxsResCAfter = await request('/finance/transactions');
  const allTrxsCAfter = trxsResCAfter.data.data;
  const aptsResCAfter = await request('/appointments');
  const freshAptCAfter = aptsResCAfter.data.data.find((a: any) => a.id === aptC.id);

  const hasOb_C_After = allTrxsCAfter.some((t: any) => t.appointmentId === aptC.id && t.trxType === 'service');
  const isCompleted_C_After = freshAptCAfter.status === 'completed';
  const isSettledDisplay_C_After = hasOb_C_After || isCompleted_C_After;
  const isActionsEnabled_C_After = freshAptCAfter.status !== 'completed' && 
                                   freshAptCAfter.status !== 'canceled' && 
                                   freshAptCAfter.status !== 'rescheduled' && 
                                   !hasOb_C_After;

  console.log(`[C.2] نوبت پس از ثبت تسویه:`);
  console.log(`      hasOb: ${hasOb_C_After} (انتظار: true)`);
  console.log(`      وضعیت نوبت در دیتابیس: ${freshAptCAfter.status} (انتظار: completed)`);
  console.log(`      نمایش تسویه‌شده: ${isSettledDisplay_C_After ? 'بله ✅' : 'خیر ❌'}`);
  console.log(`      عملیات تسویه/تغییر نوبت غیرفعال شده: ${!isActionsEnabled_C_After ? 'بله ✅' : 'خیر ❌'}`);

  const passedC = isActionsEnabled_C_Before && 
                  hasOb_C_After && 
                  isCompleted_C_After && 
                  isSettledDisplay_C_After && 
                  !isActionsEnabled_C_After;
  console.log(`=> نتیجه تست C: ${passedC ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // ===============================================================
  // REGRESSION CHECK: اتصال deposit -> appointment حفظ شده است
  // ===============================================================
  console.log('--- REGRESSION CHECK: بررسی حفظ اتصال رکورد بیعانه به نوبت ---');
  const depDetailARes = await request(`/deposits/${depA.id}`);
  const depDetailA = depDetailARes.data.data;
  const depDetailBRes = await request(`/deposits/${depB.id}`);
  const depDetailB = depDetailBRes.data.data;

  const linkAPreserved = depDetailA.appointmentId === aptA.id;
  const linkBPreserved = depDetailB.appointmentId === createdAptIdB;

  console.log(`      اتصال بیعانه A به نوبت ${aptA.id}: ${linkAPreserved ? 'برقرار است ✅' : 'قطع شده ❌'}`);
  console.log(`      اتصال بیعانه B به نوبت ${createdAptIdB}: ${linkBPreserved ? 'برقرار است ✅' : 'قطع شده ❌'}`);

  const passedRegression = linkAPreserved && linkBPreserved;
  console.log(`=> نتیجه تست رگرسیون اتصال: ${passedRegression ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  console.log('====================================================');
  console.log(`خلاصه نهایی:`);
  console.log(`تست A (نوبت قبلی + بیعانه ناقص): ${passedA ? 'موفق ✅' : 'ناموفق ❌'}`);
  console.log(`تست B (بیعانه + نوبت مرحله ۴): ${passedB ? 'موفق ✅' : 'ناموفق ❌'}`);
  console.log(`تست C (نوبت بدون بیعانه): ${passedC ? 'موفق ✅' : 'ناموفق ❌'}`);
  console.log(`تست رگرسیون اتصال بیعانه به نوبت: ${passedRegression ? 'موفق ✅' : 'ناموفق ❌'}`);
  console.log('====================================================');
}

runValidationTests().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
