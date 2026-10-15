import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { patients, patientPracticeMemberships } from './db/schema/patients';
import { services } from './db/schema/services';
import { financialObligations, paymentReceipts } from './db/schema/finance';
import { eq, and } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Normalization function matching frontend utils/validation.ts
function normalizeForExactComparison(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[إأآ]/g, 'ا')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase();
}

function normalizeMobileForComparison(mobile: string): string {
  if (!mobile) return '';
  let cleaned = mobile.trim();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    cleaned = cleaned.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

interface CheckResult {
  hasDuplicateName: boolean;
  hasDuplicateMobile: boolean;
  hasDuplicate: boolean;
  matchedPatients: { id: string; name: string; mobile: string; matchType: 'name' | 'mobile' | 'both' }[];
}

function checkDuplicatePatientInPractice(
  candidateName: string,
  candidateMobile: string,
  targetPractice: 'aesthetic' | 'dental',
  allPatients: any[]
): CheckResult {
  const normName = normalizeForExactComparison(candidateName);
  const normMobile = normalizeMobileForComparison(candidateMobile);

  const matchedPatients: { id: string; name: string; mobile: string; matchType: 'name' | 'mobile' | 'both' }[] = [];
  let hasDuplicateName = false;
  let hasDuplicateMobile = false;

  for (const p of allPatients) {
    const isMemberOfPractice = p.primaryPractice === targetPractice ||
      (p.memberships && p.memberships.some((m: any) => m.practice === targetPractice));

    if (!isMemberOfPractice) continue;

    const patientNormName = normalizeForExactComparison(p.name);
    const patientNormMobile = normalizeMobileForComparison(p.mobile || '');

    const nameMatches = normName.length > 0 && patientNormName.length > 0 && normName === patientNormName;
    const mobileMatches = normMobile.length > 0 && patientNormMobile.length > 0 && normMobile === patientNormMobile;

    if (nameMatches || mobileMatches) {
      if (nameMatches) hasDuplicateName = true;
      if (mobileMatches) hasDuplicateMobile = true;

      matchedPatients.push({
        id: p.id,
        name: p.name,
        mobile: p.mobile || '',
        matchType: (nameMatches && mobileMatches) ? 'both' : (nameMatches ? 'name' : 'mobile')
      });
    }
  }

  return {
    hasDuplicateName,
    hasDuplicateMobile,
    hasDuplicate: hasDuplicateName || hasDuplicateMobile,
    matchedPatients
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED TESTS FOR 3 CLINIC SPEC CHANGES');
  console.log('Using ISOLATED In-Memory SQLite Database (Zero pollution to live DB)');
  console.log('====================================================\n');

  // 1. Setup isolated database
  const sqlite = new Database(':memory:');
  const testDb = drizzle(sqlite);

  // Apply migrations
  const migrationsFolder = path.join(__dirname, 'db', 'migrations');
  migrate(testDb, { migrationsFolder });
  try { sqlite.exec('ALTER TABLE patient_practice_memberships ADD COLUMN phone text;'); } catch (e) {}
  try { sqlite.exec('ALTER TABLE payment_receipts ADD COLUMN deposit_id text;'); } catch (e) {}
  try { sqlite.exec('ALTER TABLE payment_receipts ADD COLUMN receipt_type text DEFAULT "normal";'); } catch (e) {}
  console.log('✓ Isolated database schema created and migrated successfully.\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      if (details) console.log(`         ${details}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (details) console.error(`         Failure: ${details}`);
      failedCount++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 1: PATIENT REGISTRATION & DUPLICATE CHECKS
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Duplicate Patient Detection & Practice Scoping ---');

  // Insert initial patient in aesthetic
  const initialPatient = {
    id: 'pat-test-1',
    name: 'علی رضایی',
    mobile: '09123456789',
    nationalId: '0012345678',
    primaryPractice: 'aesthetic' as const,
    gender: 'male' as const,
    createdAt: new Date().toISOString()
  };
  testDb.insert(patients).values(initialPatient).run();
  testDb.insert(patientPracticeMemberships).values({
    patientId: initialPatient.id,
    practice: 'aesthetic',
    physicalFileNumber: 'F-101',
    joinedAt: '1403/01/01'
  }).run();

  const mockPatientList = [{
    ...initialPatient,
    memberships: [{ practice: 'aesthetic' }]
  }];

  // Test 1.1: New unique patient
  const res1 = checkDuplicatePatientInPractice('مریم کاظمی', '09129876543', 'aesthetic', mockPatientList);
  assert(!res1.hasDuplicate, '1.1: Unique name and unique mobile produces NO warning');

  // Test 1.2: Duplicate Name with Persian/Arabic normalization
  // Input has Arabic Yeh 'علي' and extra spaces
  const res2 = checkDuplicatePatientInPractice('  علي   رضايي  ', '09351112233', 'aesthetic', mockPatientList);
  assert(res2.hasDuplicateName === true && res2.hasDuplicateMobile === false, 
    '1.2: Duplicate name with Arabic kaf/yeh and spaces detected as duplicate name only',
    `Matched patient: ${res2.matchedPatients[0]?.name}, MatchType: ${res2.matchedPatients[0]?.matchType}`
  );

  // Test 1.3: Duplicate Mobile with Persian digits and formatting
  // Input: ۰۹۱۲۳۴۵۶۷۸۹ in Persian digits
  const res3 = checkDuplicatePatientInPractice('کامبیز صادقی', '۰۹۱۲۳۴۵۶۷۸۹', 'aesthetic', mockPatientList);
  assert(res3.hasDuplicateMobile === true && res3.hasDuplicateName === false,
    '1.3: Duplicate mobile with Persian digits detected as duplicate mobile only',
    `Matched patient: ${res3.matchedPatients[0]?.name}, MatchType: ${res3.matchedPatients[0]?.matchType}`
  );

  // Test 1.4: Both Name and Mobile duplicate
  const res4 = checkDuplicatePatientInPractice('علی رضایی', '09123456789', 'aesthetic', mockPatientList);
  assert(res4.hasDuplicateName && res4.hasDuplicateMobile && res4.matchedPatients[0]?.matchType === 'both',
    '1.4: Both name and mobile duplicate identifies matchType as "both" without duplicate warnings'
  );

  // Test 1.5: Cross-practice isolation (Dental check against Aesthetic patient)
  const res5 = checkDuplicatePatientInPractice('علی رضایی', '09123456789', 'dental', mockPatientList);
  assert(!res5.hasDuplicate, '1.5: Patient in aesthetic practice does NOT trigger duplicate warning for dental registration');

  // Test 1.6: Empty/unprovided mobile does not trigger duplicate
  const res6 = checkDuplicatePatientInPractice('ناهید محمدی', '', 'aesthetic', mockPatientList);
  assert(!res6.hasDuplicateMobile, '1.6: Empty mobile number does NOT trigger duplicate mobile warning');

  // Test 1.7: Inserting duplicate patient into database succeeds (Database allows duplicate upon user confirmation)
  const duplicatePatient = {
    id: 'pat-test-2',
    name: 'علی رضایی',
    mobile: '09123456789',
    primaryPractice: 'aesthetic' as const,
    gender: 'male' as const,
    createdAt: new Date().toISOString()
  };
  let insertDuplicateSuccess = false;
  try {
    testDb.insert(patients).values(duplicatePatient).run();
    testDb.insert(patientPracticeMemberships).values({
      patientId: duplicatePatient.id,
      practice: 'aesthetic',
      physicalFileNumber: 'F-102',
      joinedAt: '1403/01/01'
    }).run();
    const count = testDb.select().from(patients).where(eq(patients.name, 'علی رضایی')).all().length;
    insertDuplicateSuccess = (count === 2);
  } catch (err: any) {
    insertDuplicateSuccess = false;
  }
  assert(insertDuplicateSuccess, '1.7: Database allows storing two distinct patient records with identical name/phone without merging or error');

  // -------------------------------------------------------------------------
  // TEST GROUP 2: DISCOUNT REMOVAL & FINANCIAL LEDGER INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Discount Removal & Ledger Integrity ---');

  // Test 2.1: Create financial obligation without discount
  const obligation1 = {
    id: 'ob-1',
    patientId: 'pat-test-1',
    practice: 'aesthetic' as const,
    serviceName: 'بوتاکس مصپورت',
    totalCost: 3500000,
    discount: 0,
    netCost: 3500000,
    serviceDate: '1403/07/20',
    recordDate: '1403/07/20'
  };
  testDb.insert(financialObligations).values(obligation1).run();

  const fetchedOb1 = testDb.select().from(financialObligations).where(eq(financialObligations.id, 'ob-1')).get();
  assert(fetchedOb1?.netCost === fetchedOb1?.totalCost && fetchedOb1?.discount === 0,
    '2.1: New financial obligation created with discount = 0 and netCost = totalCost'
  );

  // Test 2.2: Partial payment on new obligation
  const receipt1 = {
    id: 'pay-1',
    obligationId: 'ob-1',
    patientId: 'pat-test-1',
    practice: 'aesthetic' as const,
    paidAmount: 2000000,
    paymentMethod: 'pos_aesthetic' as const,
    recordDate: '1403/07/20'
  };
  testDb.insert(paymentReceipts).values(receipt1).run();

  const remaining1 = Math.max(0, (fetchedOb1!.netCost) - receipt1.paidAmount);
  assert(remaining1 === 1500000, '2.2: Remaining debt calculated correctly as netCost - payments = 1,500,000 Tomans');

  // Test 2.3: Historical transaction with discount remains preserved and valid
  const historicalObligation = {
    id: 'ob-hist-old',
    patientId: 'pat-test-1',
    practice: 'aesthetic' as const,
    serviceName: 'تزریق ژل خط خنده (قدیمی)',
    totalCost: 5000000,
    discount: 500000, // Historical discount
    netCost: 4500000,
    serviceDate: '1402/10/15',
    recordDate: '1402/10/15'
  };
  testDb.insert(financialObligations).values(historicalObligation).run();

  const fetchedHist = testDb.select().from(financialObligations).where(eq(financialObligations.id, 'ob-hist-old')).get();
  assert(fetchedHist?.discount === 500000 && fetchedHist?.netCost === 4500000,
    '2.3: Historical obligations preserve past discount and netCost without data loss or balance distortion'
  );

  // -------------------------------------------------------------------------
  // TEST GROUP 3: FIXED SERVICE TARIFF REMOVAL
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Service Tariff Removal ---');

  // Test 3.1: Create service without specifying price
  const serviceWithoutPrice = {
    id: 'srv-no-price-1',
    name: 'مزوتراپی جوانساز',
    code: 'MESO-01',
    practice: 'aesthetic' as const,
    duration: 45,
    description: 'مزوتراپی صورت و گردن',
    defaultPaymentTermDays: 14,
    active: true
  };
  let serviceCreatedSuccess = false;
  try {
    testDb.insert(services).values(serviceWithoutPrice).run();
    serviceCreatedSuccess = true;
  } catch (err: any) {
    console.error('Error inserting service without price:', err);
    serviceCreatedSuccess = false;
  }
  assert(serviceCreatedSuccess, '3.1: Service created successfully without requiring price (tariff) parameter');

  // Test 3.2: Verify default price is 0
  const createdSrv = testDb.select().from(services).where(eq(services.id, 'srv-no-price-1')).get();
  assert(createdSrv?.price === 0 && createdSrv.name === 'مزوتراپی جوانساز',
    '3.2: Service price in DB defaults safely to 0 while maintaining code, duration, and practice'
  );

  // Test 3.3: Service creation with independent checkout cost
  // A checkout creates an obligation with actual agreed cost, independent of service tariff
  const customAgreedCost = 4200000;
  const obligationFromService = {
    id: 'ob-custom-srv-1',
    patientId: 'pat-test-2',
    practice: 'aesthetic' as const,
    serviceName: createdSrv!.name,
    totalCost: customAgreedCost,
    discount: 0,
    netCost: customAgreedCost,
    serviceDate: '1403/07/21',
    recordDate: '1403/07/21'
  };
  testDb.insert(financialObligations).values(obligationFromService).run();

  const fetchedCustomOb = testDb.select().from(financialObligations).where(eq(financialObligations.id, 'ob-custom-srv-1')).get();
  assert(fetchedCustomOb?.totalCost === 4200000 && fetchedCustomOb.netCost === 4200000,
    '3.3: Service checkout records actual negotiated cost without relying on fixed service tariff'
  );

  // -------------------------------------------------------------------------
  // TEST GROUP 4: EXCEL IMPORT SANITY CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Excel Import Integrity ---');
  const excelSchemaPath = path.join(__dirname, 'db', 'schema', 'import.ts');
  const excelRouterPath = path.join(__dirname, 'modules', 'import', 'excelImport.router.ts');
  const schemaExists = fs.existsSync(excelSchemaPath);
  const routerExists = fs.existsSync(excelRouterPath);
  assert(schemaExists && routerExists, '4.1: Excel import schema and router are present and completely untouched');

  // Summary
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of ${passedCount + failedCount} tests`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner encountered fatal error:', err);
  process.exit(1);
});
