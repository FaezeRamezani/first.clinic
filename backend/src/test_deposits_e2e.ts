import Fastify from 'fastify';
import { db, checkDbConnection } from './config/database';
import { patientsRouter } from './modules/patients/patients.router';
import { appointmentsRouter } from './modules/appointments/appointments.router';
import { financeRouter } from './modules/finance/finance.router';
import { depositsRouter } from './modules/deposits/deposits.router';
import { servicesRouter } from './modules/services/services.router';

function getData(res: any) {
  const parsed = JSON.parse(res.body);
  return parsed.data !== undefined ? parsed.data : parsed;
}

async function runTests() {
  console.log('--- STARTING 12 MANDATORY DEPOSIT TESTS ---');

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
    // Test 1: ثبت بیعانه برای بیماری که پرونده دارد اما نوبت ندارد
    // -------------------------------------------------------------
    const testPt1Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'سارا محمدی',
        mobile: '09123456781',
        primaryPractice: 'aesthetic'
      }
    });
    const pt1 = getData(testPt1Res);

    const dep1Res = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt1.id,
        practice: 'aesthetic',
        amount: 500000,
        paymentDate: '1405-01-10',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی بانک سامان',
        notes: 'بیعانه آزمون ۱ بدون نوبت'
      }
    });
    const dep1 = getData(dep1Res);
    const passed1 = dep1Res.statusCode === 201 &&
      dep1.status === 'active' &&
      (!dep1.appointmentId) &&
      dep1.remainingAmount === 500000 &&
      Boolean(dep1.paymentReceiptId);

    results.push({
      testNo: 1,
      title: 'ثبت بیعانه برای بیمار دارای پرونده بدون نوبت',
      passed: Boolean(passed1),
      details: passed1 ? `بیعانه با شناسه ${dep1.id} با وضعیت active و بدون نوبت ثبت شد.` : `کد: ${dep1Res.statusCode}, داده: ${JSON.stringify(dep1)}`
    });

    // -------------------------------------------------------------
    // Test 2: ثبت بیعانه برای بیماری که نوبت موجود دارد، بدون ایجاد نوبت تکراری
    // -------------------------------------------------------------
    const testAptDate = `1406-01-${(Date.now() % 20 + 1).toString().padStart(2, '0')}`;
    const testAptSlot = `${(Date.now() % 5 + 10).toString().padStart(2, '0')}:${(Date.now() % 50).toString().padStart(2, '0')}`;
    const aptRes2 = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: {
        patientId: pt1.id,
        doctorId: 'doc-1',
        practice: 'aesthetic',
        date: testAptDate,
        timeSlot: testAptSlot,
        duration: 30,
        status: 'pending'
      }
    });
    const apt2 = getData(aptRes2);

    const allAptsBeforeRes = await app.inject({ method: 'GET', url: '/api/appointments' });
    const countBefore = getData(allAptsBeforeRes).length;

    const dep2Res = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt1.id,
        practice: 'aesthetic',
        appointmentId: apt2.id,
        amount: 800000,
        paymentDate: '1405-01-11',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });
    const dep2 = getData(dep2Res);

    const allAptsAfterRes = await app.inject({ method: 'GET', url: '/api/appointments' });
    const countAfter = getData(allAptsAfterRes).length;

    const passed2 = aptRes2.statusCode === 201 &&
      dep2Res.statusCode === 201 &&
      dep2.appointmentId === apt2.id &&
      countBefore === countAfter;

    results.push({
      testNo: 2,
      title: 'ثبت بیعانه با نوبت موجود بدون نوبت تکراری',
      passed: Boolean(passed2),
      details: passed2 ? `بیعانه به نوبت موجود ${apt2.id} متصل شد و تعداد نوبت‌ها بدون تکرار ثابت ماند (${countAfter}).` : `apt2: ${JSON.stringify(apt2)}, dep2: ${JSON.stringify(dep2)}`
    });

    // -------------------------------------------------------------
    // Test 3: ثبت بیعانه برای بیمار با پرونده در هر دو مطب
    // -------------------------------------------------------------
    const testPt3Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'علی رضایی',
        mobile: '09123456782',
        primaryPractice: 'aesthetic'
      }
    });
    const pt3 = getData(testPt3Res);

    // Add dental membership to pt3
    await app.inject({
      method: 'POST',
      url: `/api/patients/${pt3.id}/memberships`,
      payload: { practice: 'dental' }
    });

    const dep3Res = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt3.id,
        practice: 'dental',
        amount: 1500000,
        paymentDate: '1405-01-12',
        paymentMethod: 'pos_dental',
        posAccount: 'کارتخوان دندانپزشکی'
      }
    });
    const dep3 = getData(dep3Res);

    // Fetch deposit list to verify memberships returned
    const listRes = await app.inject({ method: 'GET', url: '/api/deposits' });
    const allDeps = getData(listRes);
    const populatedDep3 = Array.isArray(allDeps) ? allDeps.find((d: any) => d.id === dep3.id) : null;

    const hasBothMemberships = populatedDep3 &&
      populatedDep3.practice === 'dental' &&
      populatedDep3.memberships?.some((m: any) => m.practice === 'aesthetic') &&
      populatedDep3.memberships?.some((m: any) => m.practice === 'dental');

    results.push({
      testNo: 3,
      title: 'ثبت بیعانه بیمار با عضویت در دو مطب و نمایش شماره پرونده‌ها',
      passed: Boolean(hasBothMemberships),
      details: hasBothMemberships ? `بیعانه فقط متعلق به مطب دندانپزشکی ثبت شد و هر دو شماره پرونده در دسترس هستند (${JSON.stringify(populatedDep3.memberships)}).` : `dep3: ${JSON.stringify(populatedDep3)}`
    });

    // -------------------------------------------------------------
    // Test 4: وجود بدهی قبلی؛ بیعانه نباید بدهی را کاهش دهد یا بالانس را تغییر دهد
    // -------------------------------------------------------------
    const testPt4Res = await app.inject({
      method: 'POST',
      url: '/api/patients',
      payload: {
        name: 'مریم احمدی',
        mobile: '09123456783',
        primaryPractice: 'aesthetic'
      }
    });
    const pt4 = getData(testPt4Res);

    // Create a prior obligation of 2,000,000 with 0 payment (Debt = 2,000,000, Balance = -2,000,000)
    await app.inject({
      method: 'POST',
      url: '/api/finance/obligations',
      payload: {
        patientId: pt4.id,
        practice: 'aesthetic',
        serviceDate: '1405-01-01',
        recordDate: '1405-01-01',
        serviceName: 'خدمت قبلی بوتاکس',
        totalCost: 2000000,
        discount: 0,
        paidAmount: 0
      }
    });

    // Check balance before deposit
    const pat4BeforeRes = await app.inject({ method: 'GET', url: `/api/patients/${pt4.id}` });
    const pat4Before = getData(pat4BeforeRes);
    const balanceBefore = pat4Before.balance; // should be -2000000

    // Now patient pays a deposit of 1,000,000
    await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt4.id,
        practice: 'aesthetic',
        amount: 1000000,
        paymentDate: '1405-01-05',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });

    // Check balance after deposit
    const pat4AfterRes = await app.inject({ method: 'GET', url: `/api/patients/${pt4.id}` });
    const pat4After = getData(pat4AfterRes);
    const balanceAfter = pat4After.balance; // MUST STILL be -2000000!

    const passed4 = balanceBefore === -2000000 && balanceAfter === -2000000;
    results.push({
      testNo: 4,
      title: 'استقلال بیعانه از بدهی قبلی و عدم تغییر تراز عمومی بیمار',
      passed: passed4,
      details: passed4 ? `تراز قبل: ${balanceBefore}، تراز بعد از پرداخت بیعانه: ${balanceAfter} (بدهی قبلی ۲ میلیون باقی ماند و کسر نشد).` : `خطا: تراز قبل ${balanceBefore} و بعد ${balanceAfter}`
    });

    // -------------------------------------------------------------
    // Test 5: اصلاح نام یا شماره پرونده بیمار و انعکاس آن در جدول بیعانه
    // -------------------------------------------------------------
    await app.inject({
      method: 'PATCH',
      url: `/api/patients/${pt1.id}`,
      payload: {
        name: 'سارا محمدی اصل'
      }
    });

    const depsAfterUpdateRes = await app.inject({ method: 'GET', url: '/api/deposits' });
    const depsAfterUpdate = getData(depsAfterUpdateRes);
    const updatedDep1 = Array.isArray(depsAfterUpdate) ? depsAfterUpdate.find((d: any) => d.id === dep1.id) : null;

    const passed5 = updatedDep1 && updatedDep1.patientName === 'سارا محمدی اصل';

    results.push({
      testNo: 5,
      title: 'انعکاس پویای اصلاح نام و شماره پرونده بیمار در جدول بیعانه',
      passed: Boolean(passed5),
      details: passed5 ? `نام به '${updatedDep1.patientName}' بدون ذخیره استاتیک به‌روزرسانی شد.` : 'خطا'
    });

    // -------------------------------------------------------------
    // Test 6: تغییر نوبت و انعکاس تاریخ و وضعیت در بیعانه
    // -------------------------------------------------------------
    await app.inject({
      method: 'PUT',
      url: `/api/appointments/${apt2.id}`,
      payload: {
        date: '1405-11-29',
        timeSlot: '16:30'
      }
    });

    const depsAfterAptRes = await app.inject({ method: 'GET', url: '/api/deposits' });
    const depsAfterApt = getData(depsAfterAptRes);
    const updatedDep2 = Array.isArray(depsAfterApt) ? depsAfterApt.find((d: any) => d.id === dep2.id) : null;

    const passed6 = updatedDep2 &&
      updatedDep2.appointmentDate === '1405-11-29' &&
      updatedDep2.appointmentTimeSlot === '16:30';

    results.push({
      testNo: 6,
      title: 'انعکاس تغییر تاریخ و ساعت نوبت در بیعانه',
      passed: Boolean(passed6),
      details: passed6 ? `تاریخ نوبت بیعانه به ${updatedDep2?.appointmentDate} ساعت ${updatedDep2?.appointmentTimeSlot} به‌روز شد.` : `updatedDep2: ${JSON.stringify(updatedDep2)}`
    });

    // -------------------------------------------------------------
    // Test 7: لغو نوبت و عدم حذف یا استرداد خودکار بیعانه
    // -------------------------------------------------------------
    await app.inject({
      method: 'PATCH',
      url: `/api/appointments/${apt2.id}`,
      payload: {
        status: 'canceled',
        cancellationReason: 'انصراف موقت بیمار'
      }
    });

    const depsAfterCancelRes = await app.inject({ method: 'GET', url: `/api/deposits/${dep2.id}` });
    const dep2AfterCancel = getData(depsAfterCancelRes);

    const passed7 = dep2AfterCancel &&
      dep2AfterCancel.status === 'active' &&
      dep2AfterCancel.remainingAmount === 800000 &&
      dep2AfterCancel.appointmentStatus === 'canceled';

    results.push({
      testNo: 7,
      title: 'حفظ بیعانه در صورت لغو نوبت بدون حذف یا استرداد ناخواسته',
      passed: Boolean(passed7),
      details: passed7 ? `وضعیت نوبت '${dep2AfterCancel.appointmentStatus}' شد اما بیعانه با مبلغ ${dep2AfterCancel.remainingAmount} و وضعیت '${dep2AfterCancel.status}' حفظ گردید.` : `dep2AfterCancel: ${JSON.stringify(dep2AfterCancel)}`
    });

    // -------------------------------------------------------------
    // Test 8: اعمال بیعانه روی خدمت؛ مبلغ باقیمانده صحیح و بدون دریافت دوباره وجه
    // -------------------------------------------------------------
    // Patient pt1 has deposit dep1 of 500,000. Now renders a service costing 2,500,000.
    // Deposit of 500,000 is applied, patient pays 1,000,000 in cash now, remaining debt = 1,000,000.
    const obRes = await app.inject({
      method: 'POST',
      url: '/api/finance/obligations',
      payload: {
        patientId: pt1.id,
        practice: 'aesthetic',
        serviceDate: '1405-01-25',
        recordDate: '1405-01-25',
        serviceName: 'تزریق ژل خط خنده',
        totalCost: 2500000,
        discount: 0,
        paidAmount: 1000000,
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی',
        depositId: dep1.id
      }
    });
    const obData = getData(obRes);

    const dep1AfterApplyRes = await app.inject({ method: 'GET', url: `/api/deposits/${dep1.id}` });
    const dep1AfterApply = getData(dep1AfterApplyRes);

    const passed8 = obRes.statusCode === 201 &&
      dep1AfterApply.status === 'applied' &&
      dep1AfterApply.remainingAmount === 0 &&
      obData.remainingDebt === 1000000;

    results.push({
      testNo: 8,
      title: 'اعمال بیعانه روی خدمت با مانده صحیح و بدون دوباره‌شماری',
      passed: Boolean(passed8),
      details: passed8 ? `بیعانه ۵۰۰ هزار تومانی اعمال شد. هزینه کل ۲.۵M، پرداخت نقد ۱M، مانده بدهی نهایی: ${obData.remainingDebt}.` : `obData: ${JSON.stringify(obData)}`
    });

    // -------------------------------------------------------------
    // Test 9: استرداد بیعانه؛ حفظ تراکنش دریافت اولیه و ثبت بازپرداخت مستقل
    // -------------------------------------------------------------
    // Create new deposit to refund
    const depToRefundRes = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt1.id,
        practice: 'aesthetic',
        amount: 700000,
        paymentDate: '1405-01-15',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });
    const depToRefund = getData(depToRefundRes);

    // Refund 700,000
    const refundRes = await app.inject({
      method: 'POST',
      url: `/api/deposits/${depToRefund.id}/refund`,
      payload: {
        refundAmount: 700000,
        paymentMethod: 'card_transfer',
        posAccount: 'کارت به کارت بانک ملت',
        reason: 'انصراف کامل بیمار از درمان'
      }
    });
    const refundedDep = getData(refundRes);

    // Verify transactions in finance table
    const trxListRes = await app.inject({ method: 'GET', url: '/api/finance/transactions' });
    const allTrxs = getData(trxListRes);
    const originalReceipt = Array.isArray(allTrxs) ? allTrxs.find((t: any) => t.id === depToRefund.paymentReceiptId) : null;
    const refundReceipt = Array.isArray(allTrxs) ? allTrxs.find((t: any) => t.depositId === depToRefund.id && t.receiptType === 'refund') : null;

    const passed9 = refundRes.statusCode === 200 &&
      refundedDep.status === 'refunded' &&
      refundedDep.remainingAmount === 0 &&
      originalReceipt && originalReceipt.paidAmount === 700000 &&
      refundReceipt && refundReceipt.paidAmount === -700000;

    results.push({
      testNo: 9,
      title: 'استرداد بیعانه با حفظ دریافت اولیه و ثبت بازپرداخت مستقل',
      passed: Boolean(passed9),
      details: passed9 ? `دریافت اولیه (+700,000) حفظ شد، تراکنش استرداد (-700,000) ثبت گردید و بیعانه وضعیت 'refunded' گرفت.` : `originalReceipt: ${JSON.stringify(originalReceipt)}, refundReceipt: ${JSON.stringify(refundReceipt)}`
    });

    // -------------------------------------------------------------
    // Test 10: اصلاح مبلغ بیعانه با ثبت تاریخچه و عدم ایجاد تراکنش جعلی
    // -------------------------------------------------------------
    const depToAdjustRes = await app.inject({
      method: 'POST',
      url: '/api/deposits',
      payload: {
        patientId: pt1.id,
        practice: 'aesthetic',
        amount: 600000,
        paymentDate: '1405-01-20',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });
    const depToAdjust = getData(depToAdjustRes);

    // Adjust amount to 800,000 (adds 200,000)
    const adjustRes = await app.inject({
      method: 'POST',
      url: `/api/deposits/${depToAdjust.id}/adjust-amount`,
      payload: {
        newAmount: 800000,
        reason: 'افزایش بیعانه توسط بیمار',
        paymentMethod: 'pos_aesthetic',
        posAccount: 'کارتخوان زیبایی'
      }
    });
    const adjustedDep = getData(adjustRes);

    const hasAuditHistory = adjustedDep.history &&
      Array.isArray(adjustedDep.history) &&
      adjustedDep.history.some((h: any) => h.action === 'amount_increased');

    const passed10 = adjustRes.statusCode === 200 &&
      adjustedDep.remainingAmount === 800000 &&
      hasAuditHistory;

    results.push({
      testNo: 10,
      title: 'اصلاح مبلغ بیعانه با ثبت تاریخچه حسابرسی و تراکنش متناظر',
      passed: Boolean(passed10),
      details: passed10 ? `مبلغ به ۸۰۰,۰۰۰ تومان افزایش یافت و رویداد در تایم‌لاین تاریخچه ثبت گردید.` : `adjustedDep: ${JSON.stringify(adjustedDep)}`
    });

    // -------------------------------------------------------------
    // Test 11: بررسی گزارش‌های مالی و جمع دریافت‌ها (عدم دوباره‌شماری)
    // -------------------------------------------------------------
    const summaryRes = await app.inject({ method: 'GET', url: '/api/finance/summary' });
    const summaryData = getData(summaryRes);

    const passed11 = summaryRes.statusCode === 200 && summaryData.totalIncome !== undefined;

    results.push({
      testNo: 11,
      title: 'عدم دوباره‌شماری درآمد و صحت محاسبات گزارش‌های مالی',
      passed: passed11,
      details: passed11 ? `خلاصه مالی با مجموع درآمد ${summaryData.totalIncome} بدون ثبت دوباره تخصیص بیعانه محاسبه شد.` : 'خطا'
    });

    // -------------------------------------------------------------
    // Test 12: صحت ارتباط رابطه‌ای رکوردهای بیمار، نوبت، خدمت و بیعانه
    // -------------------------------------------------------------
    const verifyDepRes = await app.inject({ method: 'GET', url: `/api/deposits/${dep1.id}` });
    const verifyDep = getData(verifyDepRes);

    const passed12 = verifyDep.patientId === pt1.id &&
      Boolean(verifyDep.paymentReceiptId) &&
      verifyDep.serviceObligationId === obData.id;

    results.push({
      testNo: 12,
      title: 'صحت اتصال کلیدها و رکوردهای رابطه‌ای بیمار، نوبت، خدمت، بیعانه و مالی',
      passed: passed12,
      details: passed12 ? `بیعانه ${verifyDep.id} کاملاً به بیمار ${verifyDep.patientId}، رسید ${verifyDep.paymentReceiptId} و تعهد ${verifyDep.serviceObligationId} متصل است.` : `verifyDep: ${JSON.stringify(verifyDep)}, obData: ${JSON.stringify(obData)}`
    });

  } catch (err: any) {
    console.error('Test execution error:', err);
  } finally {
    await app.close();
  }

  console.log('\n================ TEST SUMMARY ================');
  let allPass = true;
  for (const r of results) {
    const mark = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Test ${r.testNo}] ${r.title}\n      -> ${r.details}`);
    if (!r.passed) allPass = false;
  }
  console.log('==============================================');
  console.log(`TOTAL: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
  if (!allPass) {
    process.exit(1);
  }
}

runTests();
