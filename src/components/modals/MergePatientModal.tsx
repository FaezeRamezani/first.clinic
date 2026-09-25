import React, { useState, useMemo } from 'react';
import { useClinic, getPhysicalFileNumber, hasPracticeMembership } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';
import { 
  GitMerge, 
  X, 
  Search, 
  User, 
  AlertTriangle, 
  Sparkles, 
  Stethoscope, 
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import type { Patient } from '../../types';

interface MergePatientModalProps {
  currentPatient: Patient;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (mergedPatient: Patient) => void;
}

export const MergePatientModal: React.FC<MergePatientModalProps> = ({
  currentPatient,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { patients, mergePatients } = useClinic();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOtherPatient, setSelectedOtherPatient] = useState<Patient | null>(null);
  const [primaryPatientId, setPrimaryPatientId] = useState<string>(currentPatient.id);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search results excluding current patient
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return patients.filter(p => {
      if (p.id === currentPatient.id) return false;
      const matchName = p.name.toLowerCase().includes(q);
      const matchMobile = p.mobile.includes(q);
      const matchNational = p.nationalId ? p.nationalId.includes(q) : false;
      const matchId = p.id.toLowerCase().includes(q);
      const matchMem = p.memberships.some(m => 
        m.physicalFileNumber.toLowerCase().includes(q) || (m.phone && m.phone.includes(q))
      );
      return matchName || matchMobile || matchNational || matchId || matchMem;
    }).slice(0, 10);
  }, [patients, searchQuery, currentPatient.id]);

  // Check practice conflict
  const practiceConflict = useMemo(() => {
    if (!selectedOtherPatient) return null;
    const currentHasDental = hasPracticeMembership(currentPatient, 'dental');
    const currentHasAesthetic = hasPracticeMembership(currentPatient, 'aesthetic');

    const otherHasDental = hasPracticeMembership(selectedOtherPatient, 'dental');
    const otherHasAesthetic = hasPracticeMembership(selectedOtherPatient, 'aesthetic');

    const conflicts: string[] = [];
    if (currentHasDental && otherHasDental) conflicts.push('دندانپزشکی');
    if (currentHasAesthetic && otherHasAesthetic) conflicts.push('زیبایی');

    return conflicts.length > 0 ? conflicts : null;
  }, [currentPatient, selectedOtherPatient]);

  // Check phone difference
  const hasDifferentPhones = useMemo(() => {
    if (!selectedOtherPatient) return false;
    return currentPatient.mobile !== selectedOtherPatient.mobile;
  }, [currentPatient, selectedOtherPatient]);

  if (!isOpen) return null;

  const handleSelectPatient = (other: Patient) => {
    setSelectedOtherPatient(other);
    setSearchQuery('');
    setErrorMsg(null);
  };

  const handleClearSelected = () => {
    setSelectedOtherPatient(null);
    setPrimaryPatientId(currentPatient.id);
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (!selectedOtherPatient) return;
    if (practiceConflict) {
      setErrorMsg(`امکان ادغام وجود ندارد؛ هر دو بیمار دارای پرونده در مطب «${practiceConflict.join(' و ')}» هستند.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await mergePatients(currentPatient.id, selectedOtherPatient.id, primaryPatientId);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در انجام عملیات ادغام پرونده‌ها');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">ادغام دستی دو پرونده بیمار</h2>
              <p className="text-[11px] text-slate-400">یکسان‌سازی دو پرونده متعلق به یک شخص واحد و تجمیع سوابق</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Step 1: Current Patient Info Summary */}
          <div>
            <span className="block text-[11px] font-extrabold text-slate-500 mb-1.5">
              پرونده مبدأ (بیمار فعلی):
            </span>
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-indigo-950 font-black text-sm">{currentPatient.name}</strong>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-semibold">
                    کد ملی: {currentPatient.nationalId ? toFarsiDigits(currentPatient.nationalId) : 'ثبت نشده'}
                  </span>
                </div>
                <div className="text-slate-600 mt-1 flex items-center gap-2">
                  <span>موبایل: <strong className="text-slate-800">{toFarsiDigits(currentPatient.mobile)}</strong></span>
                </div>
              </div>

              {/* Memberships */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {hasPracticeMembership(currentPatient, 'dental') && (
                  <span className="px-2 py-1 bg-teal-100/80 text-teal-800 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-teal-200">
                    <Stethoscope className="w-3 h-3 text-teal-600" />
                    <span>دندانپزشکی ({toFarsiDigits(getPhysicalFileNumber(currentPatient, 'dental'))})</span>
                  </span>
                )}
                {hasPracticeMembership(currentPatient, 'aesthetic') && (
                  <span className="px-2 py-1 bg-purple-100/80 text-purple-800 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-purple-200">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>زیبایی ({toFarsiDigits(getPhysicalFileNumber(currentPatient, 'aesthetic'))})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Search or Display Second Patient */}
          <div>
            <span className="block text-[11px] font-extrabold text-slate-500 mb-1.5">
              پرونده دوم (جهت ادغام):
            </span>

            {!selectedOtherPatient ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی بیمار بر اساس نام، شماره موبایل، کد ملی یا شماره پرونده..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pr-10 pl-3 py-2.5 text-xs text-slate-800 outline-none"
                    autoFocus
                  />
                </div>

                {searchQuery.trim() && (
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-xs">
                    {searchResults.length === 0 ? (
                      <p className="p-4 text-center text-slate-400">بیماری با این مشخصات یافت نشد.</p>
                    ) : (
                      searchResults.map((p) => {
                        const hasD = hasPracticeMembership(p, 'dental');
                        const hasA = hasPracticeMembership(p, 'aesthetic');
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPatient(p)}
                            className="p-3 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{p.name}</span>
                                <span className="text-[10px] text-slate-500 dir-ltr">{toFarsiDigits(p.mobile)}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                کد ملی: {p.nationalId ? toFarsiDigits(p.nationalId) : '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {hasD && (
                                <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[9px] font-bold border border-teal-200">
                                  دندانپزشکی ({toFarsiDigits(getPhysicalFileNumber(p, 'dental'))})
                                </span>
                              )}
                              {hasA && (
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold border border-purple-200">
                                  زیبایی ({toFarsiDigits(getPhysicalFileNumber(p, 'aesthetic'))})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-amber-950 font-black text-sm">{selectedOtherPatient.name}</strong>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                      کد ملی: {selectedOtherPatient.nationalId ? toFarsiDigits(selectedOtherPatient.nationalId) : 'ثبت نشده'}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1 flex items-center gap-2">
                    <span>موبایل: <strong className="text-slate-800">{toFarsiDigits(selectedOtherPatient.mobile)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasPracticeMembership(selectedOtherPatient, 'dental') && (
                      <span className="px-2 py-1 bg-teal-100/80 text-teal-800 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-teal-200">
                        <Stethoscope className="w-3 h-3 text-teal-600" />
                        <span>دندانپزشکی ({toFarsiDigits(getPhysicalFileNumber(selectedOtherPatient, 'dental'))})</span>
                      </span>
                    )}
                    {hasPracticeMembership(selectedOtherPatient, 'aesthetic') && (
                      <span className="px-2 py-1 bg-purple-100/80 text-purple-800 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-purple-200">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>زیبایی ({toFarsiDigits(getPhysicalFileNumber(selectedOtherPatient, 'aesthetic'))})</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelected}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>تغییر</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Practice Conflict Warning */}
          {practiceConflict && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-xs">تعارض در عضویت مطب (امکان ادغام وجود ندارد)</p>
                <p className="text-[11px] mt-0.5 text-rose-700 leading-relaxed">
                  هر دو پرونده دارای عضویت در مطب «{practiceConflict.join(' و ')}» می‌باشند. یک شخص نمی‌تواند پس از ادغام دارای دو پرونده مجزا در یک مطب باشد. لطفاً ابتدا وضعیت پرونده تکراری در این مطب را بررسی فرمایید.
                </p>
              </div>
            </div>
          )}

          {/* Different Phone Notice */}
          {selectedOtherPatient && !practiceConflict && hasDifferentPhones && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2 text-blue-800">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                شماره تماس دو پرونده متفاوت است (<strong>{toFarsiDigits(currentPatient.mobile)}</strong> و <strong>{toFarsiDigits(selectedOtherPatient.mobile)}</strong>). پس از ادغام، شماره پرونده غیر اصلی به عنوان شماره تماس اختصاصی همان مطب ثبت و حفظ خواهد شد.
              </p>
            </div>
          )}

          {/* Step 3: Choose Primary Patient */}
          {selectedOtherPatient && !practiceConflict && (
            <div>
              <span className="block text-[11px] font-extrabold text-slate-600 mb-2">
                انتخاب پرونده اصلی (بیمار باقی‌مانده):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Current Patient as Primary */}
                <div
                  onClick={() => setPrimaryPatientId(currentPatient.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    primaryPatientId === currentPatient.id
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>{currentPatient.name} (پرونده فعلی)</span>
                    </span>
                    {primaryPatientId === currentPatient.id && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    نام، کد ملی و موبایل اصلی از پرونده فعلی حفظ خواهد شد.
                  </p>
                </div>

                {/* Option 2: Other Patient as Primary */}
                <div
                  onClick={() => setPrimaryPatientId(selectedOtherPatient.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    primaryPatientId === selectedOtherPatient.id
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>{selectedOtherPatient.name} (پرونده دوم)</span>
                    </span>
                    {primaryPatientId === selectedOtherPatient.id && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    نام، کد ملی و موبایل اصلی از پرونده دوم حفظ خواهد شد.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Warning Notice */}
          {selectedOtherPatient && !practiceConflict && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              💡 <strong>توضیحات ادغام:</strong> کلیه نوبت‌ها، اسناد مالی، سوابق درمان و وظایف پیگیری پرونده دوم به بیمار اصلی منتقل شده و عضویت مطب‌ها در کنار هم قرار می‌گیرند. این عملیات قابل بازگشت نیست.
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
              {errorMsg}
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedOtherPatient || !!practiceConflict || isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <GitMerge className="w-4 h-4" />
            <span>{isSubmitting ? 'در حال اجرای ادغام...' : 'تأیید و اجرای ادغام پرونده‌ها'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
