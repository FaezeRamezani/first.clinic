import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { getTodayJalaliDate } from '../../utils/persianUtils';
import { X } from 'lucide-react';

export const NewPatientModal: React.FC = () => {
  const { isNewPatientOpen, setIsNewPatientOpen, addPatient, patients, ensurePatientMembership } = useClinic();

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

  React.useEffect(() => {
    if (isNewPatientOpen) {
      setName('');
      setMobile('');
      setNationalId('');
      setGender('female');
      setPrimaryPractice('aesthetic');
      setAllergiesStr('');
      setMedicalNotes('');
    }
  }, [isNewPatientOpen]);

  if (!isNewPatientOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;

    // Check duplicate warning by mobile / national ID
    const duplicate = patients.find(p => p.mobile === mobile || (nationalId && p.nationalId === nationalId));
    if (duplicate) {
      alert(`اطلاعات این شخص قبلاً با نام «${duplicate.name}» در سیستم ثبت شده است. عضویت ${primaryPractice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'} برای همین بیمار فعال گردید.`);
      ensurePatientMembership(duplicate.id, primaryPractice);
      setIsNewPatientOpen(false);
      setName('');
      setMobile('');
      setNationalId('');
      return;
    }

    addPatient({
      name,
      mobile,
      nationalId: nationalId || '۰۰۰۰۰۰۰۰۰۰',
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی بیمار:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلا: ناهید رضایی"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره موبایل:</label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">کد ملی ۱۰ رقمی:</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="۰۰۱۲۳۴۵۶۷۸"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewPatientOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              تشکیل پرونده
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
