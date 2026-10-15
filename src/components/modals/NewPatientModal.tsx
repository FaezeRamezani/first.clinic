import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { getTodayJalaliDate, toFarsiDigits } from '../../utils/persianUtils';
import { 
  validatePersianName, 
  validateIranianMobile, 
  validateIranianNationalId, 
  normalizeDigits,
  checkDuplicatePatientInPractice,
  type DuplicatePatientCheckResult
} from '../../utils/validation';
import { X, AlertCircle, AlertTriangle } from 'lucide-react';

export const NewPatientModal: React.FC = () => {
  const { isNewPatientOpen, setIsNewPatientOpen, addPatient, patients } = useClinic();

  const [name, setName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [birthDate] = useState<string>('');
  const [primaryPractice, setPrimaryPractice] = useState<'aesthetic' | 'dental'>('aesthetic');
  const [allergiesStr, setAllergiesStr] = useState<string>('');
  const [medicalNotes, setMedicalNotes] = useState<string>('');
  const [emergencyName] = useState<string>('');
  const [emergencyPhone] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicatePatientCheckResult | null>(null);

  React.useEffect(() => {
    if (isNewPatientOpen) {
      setName('');
      setMobile('');
      setNationalId('');
      setGender('female');
      setPrimaryPractice('aesthetic');
      setAllergiesStr('');
      setMedicalNotes('');
      setErrorMessage(null);
      setDuplicateWarning(null);
    }
  }, [isNewPatientOpen]);

  if (!isNewPatientOpen) return null;

  const executePatientCreation = (cleanName: string, cleanMobile: string, cleanNationalId: string) => {
    addPatient({
      name: cleanName,
      mobile: cleanMobile,
      nationalId: cleanNationalId,
      gender,
      birthDate,
      primaryPractice,
      memberships: [{ practice: primaryPractice, physicalFileNumber: String(100 + patients.length + 1), joinedAt: getTodayJalaliDate() }],
      allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [],
      medicalNotes,
      emergencyContact: {
        name: emergencyName || '-',
        phone: emergencyPhone || '-',
        relation: 'بستگان'
      }
    });

    setIsNewPatientOpen(false);
    setName('');
    setMobile('');
    setNationalId('');
    setErrorMessage(null);
    setDuplicateWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate Name
    const nameVal = validatePersianName(name, 'نام و نام خانوادگی');
    if (!nameVal.isValid) {
      setErrorMessage(nameVal.error || 'نام بیمار معتبر نیست');
      return;
    }

    // 2. Validate Mobile
    const mobileVal = validateIranianMobile(mobile);
    if (!mobileVal.isValid) {
      setErrorMessage(mobileVal.error || 'شماره موبایل معتبر نیست');
      return;
    }

    // 3. Validate National ID (Optional)
    const nidVal = validateIranianNationalId(nationalId, true);
    if (!nidVal.isValid) {
      setErrorMessage(nidVal.error || 'کد ملی معتبر نیست');
      return;
    }

    const cleanName = nameVal.normalized;
    const cleanMobile = mobileVal.normalized;
    const cleanNationalId = nidVal.normalized;

    // Check for duplicate name or mobile in the same practice
    const dupCheck = checkDuplicatePatientInPractice(cleanName, cleanMobile, primaryPractice, patients);
    if (dupCheck.hasDuplicate) {
      setDuplicateWarning(dupCheck);
      return;
    }

    executePatientCreation(cleanName, cleanMobile, cleanNationalId);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800">تشکیل پرونده الکترونیک بیمار جدید</h3>
          <button onClick={() => setIsNewPatientOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی بیمار:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="مثلا: ناهید رضایی"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره موبایل:</label>
              <input
                type="text"
                required
                maxLength={11}
                value={mobile}
                onChange={(e) => {
                  setMobile(normalizeDigits(e.target.value));
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">کد ملی ۱۰ رقمی (اختیاری):</label>
              <input
                type="text"
                maxLength={10}
                value={nationalId}
                onChange={(e) => {
                  setNationalId(normalizeDigits(e.target.value));
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="۰۰۱۲۳۴۵۶۷۹"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">جنسیت:</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="female">زن</option>
                <option value="male">مرد</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مطب اصلی مراجعه:</label>
              <select
                value={primaryPractice}
                onChange={(e) => setPrimaryPractice(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="aesthetic">مطب زیبایی (دکتر رمضانی)</option>
                <option value="dental">مطب دندانپزشکی (دکتر آخرتی)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">حساسیت‌های دارویی (با کاما جدا کنید):</label>
            <input
              type="text"
              value={allergiesStr}
              onChange={(e) => setAllergiesStr(e.target.value)}
              placeholder="مثلا: پنی‌سیلین، لیدوکائین"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">توضیحات و سوابق پزشکی اولیه:</label>
            <textarea
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="پیشینه بیماری یا تزریق..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Duplicate Patient Warning Banner */}
          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-amber-950">
                    {duplicateWarning.duplicateType === 'both' && 'بیماری با نام و شماره تلفن واردشده در بیماران همین مطب وجود دارد. آیا ثبت بیمار جدید با این مشخصات مورد تأیید است؟'}
                    {duplicateWarning.duplicateType === 'name' && 'بیماری با نام واردشده در بیماران همین مطب وجود دارد. آیا ثبت بیمار جدید با این مشخصات مورد تأیید است؟'}
                    {duplicateWarning.duplicateType === 'mobile' && 'بیماری با شماره تلفن واردشده در بیماران همین مطب وجود دارد. آیا ثبت بیمار جدید با این مشخصات مورد تأیید است؟'}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    مشخصه تکراری: <span className="font-bold underline">{duplicateWarning.duplicateType === 'both' ? 'نام و شماره تلفن' : duplicateWarning.duplicateType === 'name' ? 'نام بیمار' : 'شماره تلفن'}</span> در مطب {primaryPractice === 'aesthetic' ? 'زیبایی' : 'دندانپزشکی'}
                  </p>
                </div>
              </div>

              {/* Matched patients list */}
              <div className="bg-white/90 rounded-xl p-2.5 border border-amber-200 space-y-1.5 max-h-32 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-500 block">بیمار(ان) منطبق موجود در این مطب:</span>
                {duplicateWarning.matchedPatients.map((mp) => (
                  <div key={mp.id} className="flex items-center justify-between text-[11px] py-1 border-b border-amber-100 last:border-0">
                    <span className="font-bold text-slate-800">{mp.name}</span>
                    <div className="flex items-center gap-2 text-slate-600 font-mono text-[10px]">
                      {mp.physicalFileNumber && <span>پرونده: {toFarsiDigits(mp.physicalFileNumber)}</span>}
                      <span>تلفن: {toFarsiDigits(mp.mobile)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Two clear choices */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/70 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  بازگشت و اصلاح اطلاعات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nameVal = validatePersianName(name);
                    const mobVal = validateIranianMobile(mobile);
                    const nidVal = validateIranianNationalId(nationalId, true);
                    executePatientCreation(nameVal.normalized, mobVal.normalized, nidVal.normalized);
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                >
                  تأیید و ثبت بیمار جدید
                </button>
              </div>
            </div>
          )}

          {!duplicateWarning && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewPatientOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                تشکیل پرونده
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};
