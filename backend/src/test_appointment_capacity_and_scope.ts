import Fastify from 'fastify';
import { createIsolatedTestDb } from './test_helpers/testDb';

async function runAppointmentCapacityAndScopeTests() {
  console.log('====================================================');
  console.log('STARTING TESTS: APPOINTMENT CAPACITY (MAX 3) & SCOPE');
  console.log('====================================================\n');

  // Initialize isolated temporary database
  const testEnv = await createIsolatedTestDb('capacity_scope_tests');

  // Dynamically load routers bound to the isolated database
  const { doctorsRouter } = await import('./modules/doctors/doctors.router');
  const { servicesRouter } = await import('./modules/services/services.router');
  const { patientsRouter } = await import('./modules/patients/patients.router');
  const { appointmentsRouter } = await import('./modules/appointments/appointments.router');
  const { depositsRouter } = await import('./modules/deposits/deposits.router');

  const app = Fastify({ logger: false });
  await app.register(doctorsRouter, { prefix: '/api/doctors' });
  await app.register(servicesRouter, { prefix: '/api/services' });
  await app.register(patientsRouter, { prefix: '/api/patients' });
  await app.register(appointmentsRouter, { prefix: '/api/appointments' });
  await app.register(depositsRouter, { prefix: '/api/deposits' });
  await app.ready();

  async function request(url: string, options: any = {}) {
    const res = await app.inject({
      method: (options.method || 'GET') as any,
      url: `/api${url}`,
      payload: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers
    });
    let json: any = {};
    try {
      json = JSON.parse(res.body);
    } catch {
      json = { raw: res.body };
    }
    return { status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: json };
  }

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, desc: string) {
    totalCount++;
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      throw new Error(`Test failed: ${desc}`);
    }
  }

  try {
    // 0. Setup: fetch doctors and create test patients
    const docsRes = await request('/doctors');
    const aestheticDoc = docsRes.data.data.find((d: any) => d.practice === 'aesthetic');
    const dentalDoc = docsRes.data.data.find((d: any) => d.practice === 'dental');

    assert(!!aestheticDoc && !!dentalDoc, 'پزشکان مطب ۱ (زیبایی) و مطب ۲ (دندانپزشکی) وجود دارند');

    // Create 6 test patients with valid Persian names and unique mobiles
    const persianNames = [
      'بیمار تستی اول',
      'بیمار تستی دوم',
      'بیمار تستی سوم',
      'بیمار تستی چهارم',
      'بیمار تستی پنجم',
      'بیمار تستی ششم'
    ];
    const patientsList: any[] = [];
    for (let i = 0; i < 6; i++) {
      const pRes = await request('/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: persianNames[i],
          mobile: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
          primaryPractice: i % 2 === 0 ? 'dental' : 'aesthetic'
        })
      });
      assert(pRes.ok, `ایجاد بیمار تستی شماره ${i + 1}`);
      patientsList.push(pRes.data.data);
    }

    const testDate = '1405-02-10';
    const testSlot = '10:00';

    // ===============================================================
    // سناریو ۶: ثبت نوبت اول، دوم و سوم در یک اسلات از یک مطب (زیبایی)
    // ===============================================================
    console.log('\n--- سناریو ۶: ثبت ۳ نوبت مستقل در اسلات ۱۰:۰۰ مطب زیبایی ---');
    const apt1Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[0].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(apt1Res.status === 201, 'ثبت موفق نوبت ۱ در مطب زیبایی (ظرفیت ۱/۳)');

    const apt2Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[1].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(apt2Res.status === 201, 'ثبت موفق نوبت ۲ در مطب زیبایی (ظرفیت ۲/۳)');

    const apt3Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[2].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(apt3Res.status === 201, 'ثبت موفق نوبت ۳ در مطب زیبایی (ظرفیت ۳/۳)');

    // Verify independent records
    assert(
      apt1Res.data.data.id !== apt2Res.data.data.id && apt2Res.data.data.id !== apt3Res.data.data.id,
      'هر سه نوبت رکوردهای کاملاً مستقل با شناسه‌های مجزا هستند'
    );

    // ===============================================================
    // سناریو ۷: رد شدن نوبت چهارم در همان اسلات و همان مطب
    // ===============================================================
    console.log('\n--- سناریو ۷: رد شدن نوبت چهارم در اسلات تکمیل‌شده مطب زیبایی ---');
    const apt4Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[3].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(apt4Res.status === 409, 'رد درخواست نوبت چهارم با خطای HTTP 409 Conflict');
    assert(
      apt4Res.data.error === 'ظرفیت این بازه زمانی در این مطب تکمیل شده است.',
      'پیام خطای فارسی دقیق: «ظرفیت این بازه زمانی در این مطب تکمیل شده است.»'
    );

    // ===============================================================
    // سناریو ۸: استقلال ظرفیت مطب‌ها (ثبت ۳ نوبت در همان اسلات برای دندانپزشکی)
    // ===============================================================
    console.log('\n--- سناریو ۸: استقلال ظرفیت مطب دندانپزشکی در همان تاریخ و ساعت ---');
    const dental1Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[0].id,
        doctorId: dentalDoc.id,
        practice: 'dental',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(dental1Res.status === 201, 'ثبت موفق نوبت ۱ در مطب دندانپزشکی (ظرفیت مستقل دندان ۱/۳)');

    const dental2Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[1].id,
        doctorId: dentalDoc.id,
        practice: 'dental',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(dental2Res.status === 201, 'ثبت موفق نوبت ۲ در مطب دندانپزشکی (ظرفیت مستقل دندان ۲/۳)');

    const dental3Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[2].id,
        doctorId: dentalDoc.id,
        practice: 'dental',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(dental3Res.status === 201, 'ثبت موفق نوبت ۳ در مطب دندانپزشکی (ظرفیت مستقل دندان ۳/۳)');

    const dental4Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[3].id,
        doctorId: dentalDoc.id,
        practice: 'dental',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(dental4Res.status === 409, 'رد نوبت چهارم در مطب دندانپزشکی پس از تکمیل ظرفیت ۳ نوبت');
    assert(
      dental4Res.data.error === 'ظرفیت این بازه زمانی در این مطب تکمیل شده است.',
      'پیام خطای فارسی مطب دندانپزشکی: «ظرفیت این بازه زمانی در این مطب تکمیل شده است.»'
    );

    // ===============================================================
    // سناریو ۹: آزاد شدن ظرفیت پس از لغو نوبت
    // ===============================================================
    console.log('\n--- سناریو ۹: آزاد شدن ظرفیت پس از لغو نوبت ---');
    const cancelRes = await request(`/appointments/${apt2Res.data.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'canceled',
        cancellationType: 'no_replacement',
        cancellationReason: 'لغو توسط بیمار'
      })
    });
    assert(cancelRes.ok, 'لغو موفق نوبت شماره ۲ مطب زیبایی');

    // Now booking another appointment in aesthetic 10:00 must SUCCEED because capacity was freed!
    const aptAfterCancelRes = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[4].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(aptAfterCancelRes.status === 201, 'امکان ثبت موفق نوبت جدید پس از آزادسازی ظرفیت');

    // Attempting a 5th total (4th active) should be rejected again
    const aptReFullRes = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[5].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: testSlot
      })
    });
    assert(aptReFullRes.status === 409, 'رد نوبت جدید پس از تکمیل مجدد ظرفیت ۳ نوبت فعال');

    // ===============================================================
    // سناریو ۱۰: کنترل ظرفیت در ویرایش و جابه‌جایی نوبت
    // ===============================================================
    console.log('\n--- سناریو ۱۰: کنترل ظرفیت در ویرایش و جابه‌جایی نوبت ---');
    // Create an appointment at 11:00
    const apt11Res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[5].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: '11:00'
      })
    });
    assert(apt11Res.status === 201, 'ثبت نوبت در اسلات ۱۱:۰۰');

    // Attempt to PATCH apt11 to 10:00 (which has 3 active appointments)
    const patchConflictRes = await request(`/appointments/${apt11Res.data.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        timeSlot: '10:00'
      })
    });
    assert(patchConflictRes.status === 409, 'رد جابه‌جایی نوبت به اسلات تکمیل‌شده ۱۰:۰۰ با خطای ۴۰۹');
    assert(
      patchConflictRes.data.error === 'ظرفیت این بازه زمانی در این مطب تکمیل شده است.',
      'پیام خطای صحیح در جابه‌جایی: «ظرفیت این بازه زمانی در این مطب تکمیل شده است.»'
    );

    // Reschedule flow via POST with previousAppointmentId to a FULL slot (10:00)
    const rescheduleFullRes = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[5].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: '10:00',
        previousAppointmentId: apt11Res.data.data.id
      })
    });
    assert(rescheduleFullRes.status === 409, 'رد تعیین زمان جدید (reschedule) در اسلات پر با ۴۰۹');

    // Update appointment non-schedule field (notes) does not trigger conflict
    const patchNotesRes = await request(`/appointments/${apt1Res.data.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        notes: 'یادداشت جدید بیمار بدون تغییر زمان'
      })
    });
    assert(patchNotesRes.ok, 'ویرایش فیلدهای غیرزمان‌بندی نوبت موجود در اسلات پر بدون ایجاد خطای کاذب');

    // ===============================================================
    // سناریو ۱۱: درخواست‌های همزمان (Race Condition) برای ۱ ظرفیت باقیمانده
    // ===============================================================
    console.log('\n--- سناریو ۱۱: آزمون رقابت همزمان (Race Condition) در ظرفیت باقیمانده ---');
    const slotConcurrent = '12:00';
    // Book 2 appointments in 12:00 (leaving exactly 1 capacity remaining)
    await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[0].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: slotConcurrent
      })
    });
    await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientsList[1].id,
        doctorId: aestheticDoc.id,
        practice: 'aesthetic',
        date: testDate,
        timeSlot: slotConcurrent
      })
    });

    // Fire 5 concurrent booking requests simultaneously for the 1 remaining spot
    const concurrentPromises = [2, 3, 4, 5, 0].map(idx =>
      request('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patientsList[idx].id,
          doctorId: aestheticDoc.id,
          practice: 'aesthetic',
          date: testDate,
          timeSlot: slotConcurrent
        })
      })
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const successful = concurrentResults.filter(r => r.status === 201);
    const rejected = concurrentResults.filter(r => r.status === 409);

    assert(successful.length === 1, `از ۵ درخواست همزمان، دقیقاً ۱ درخواست موفق شد (تعداد: ${successful.length})`);
    assert(rejected.length === 4, `۴ درخواست دیگر همزمان با ۴۰۹ رد شدند (تعداد: ${rejected.length})`);

    // Verify total count in DB for (aesthetic, testDate, slotConcurrent) is strictly 3
    const allSlotApts = await request(`/appointments?practice=aesthetic&date=${testDate}`);
    const active12 = allSlotApts.data.data.filter(
      (a: any) => a.timeSlot === slotConcurrent && a.status !== 'canceled' && a.status !== 'rescheduled'
    );
    assert(active12.length === 3, `تعداد رکوردهای فعال ثبت‌شده در پایگاه داده برای ساعت ۱۲:۰۰ دقیقاً ۳ نوبت است (سقف نقض نشد)`);

    // ===============================================================
    // سناریو ۱۲: حفظ عملکرد سایر بخش‌های نوبت‌دهی (فیلترها، جزئیات، حضور)
    // ===============================================================
    console.log('\n--- سناریو ۱۲: آزمون رگرسیون و حفظ عملکرد سایر بخش‌های سیستم ---');
    const getByIdRes = await request(`/appointments/${apt1Res.data.data.id}`);
    assert(getByIdRes.ok && getByIdRes.data.data.id === apt1Res.data.data.id, 'دریافت صحیح جزئیات نوبت با شناسه');

    const statusUpdateRes = await request(`/appointments/${apt1Res.data.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'checked_in',
        presenceStatus: 'present'
      })
    });
    assert(statusUpdateRes.ok && statusUpdateRes.data.data.status === 'checked_in', 'تغییر وضعیت نوبت به پذیرش شده / حاضر');

    console.log('\n====================================================');
    console.log(`تمام آزمون‌های ظرفیت و اسکوپ با موفقیت گذرانده شدند! (${passedCount}/${totalCount})`);
    console.log('====================================================');
  } finally {
    testEnv.cleanup();
  }
}

runAppointmentCapacityAndScopeTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
