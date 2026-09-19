import React, { useState } from 'react';
import { useClinic, hasPracticeMembership, getPhysicalFileNumber } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, formatJalaliDateDisplay } from '../../utils/persianUtils';
import { validatePhysicalFileNumber, validatePersianName, validateIranianMobile, validateIranianNationalId } from '../../utils/validation';
import { patientsApi } from '../../services/api';
import { 
  X, 
  User, 
  AlertTriangle, 
  CalendarDays, 
  Wallet, 
  Stethoscope, 
  Sparkles,
  UploadCloud,
  Edit2,
  Save,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import type { Patient } from '../../types';

interface PatientDetailModalProps {
  patient: Patient;
  onClose: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, onClose }) => {
  const { patients, appointments, transactions, openPaymentCollection, openNewAppointment, refreshPatients } = useClinic();

  // Always derive fresh patient from context state so balance & profile data is 100% reactive
  const currentPatient = patients.find(p => p.id === patient.id) || patient;

  const hasDental = hasPracticeMembership(currentPatient, 'dental');
  const hasAesthetic = hasPracticeMembership(currentPatient, 'aesthetic');

  // Initial scope: if in both, 'unified'; if only dental, 'dental'; if only aesthetic, 'aesthetic'
  const initialScope = (hasDental && hasAesthetic) ? 'unified' : (hasDental ? 'dental' : 'aesthetic');
  const [detailScope, setDetailScope] = useState<'unified' | 'dental' | 'aesthetic'>(initialScope);

  const [activeTab, setActiveTab] = useState<'basic' | 'appointments' | 'ledger' | 'treatments'>('ledger');
  const [newDoctorNote, setNewDoctorNote] = useState<string>('');

  // Draft Edit State for Personal Info & Practice File Numbers
  const [isEditingPersonal, setIsEditingPersonal] = useState<boolean>(false);
  const [draftName, setDraftName] = useState<string>('');
  const [draftMobile, setDraftMobile] = useState<string>('');
  const [draftNationalId, setDraftNationalId] = useState<string>('');
  const [draftBirthDate, setDraftBirthDate] = useState<string>('');
  const [draftGender, setDraftGender] = useState<'female' | 'male' | ''>('');
  const [draftDentalFile, setDraftDentalFile] = useState<string>('');
  const [draftAestheticFile, setDraftAestheticFile] = useState<string>('');
  const [draftMedicalNotes, setDraftMedicalNotes] = useState<string>('');
  const [draftEmergencyName, setDraftEmergencyName] = useState<string>('');
  const [draftEmergencyPhone, setDraftEmergencyPhone] = useState<string>('');
  const [draftEmergencyRelation, setDraftEmergencyRelation] = useState<string>('');
  const [isSavingPersonal, setIsSavingPersonal] = useState<boolean>(false);

  const startEditingPersonal = () => {
    setDraftName(currentPatient.name || '');
    setDraftMobile(currentPatient.mobile || '');
    setDraftNationalId(currentPatient.nationalId || '');
    setDraftBirthDate(currentPatient.birthDate || '');
    setDraftGender(currentPatient.gender || '');
    setDraftDentalFile(getPhysicalFileNumber(currentPatient, 'dental'));
    setDraftAestheticFile(getPhysicalFileNumber(currentPatient, 'aesthetic'));
    setDraftMedicalNotes(currentPatient.medicalNotes || '');
    setDraftEmergencyName(currentPatient.emergencyContact?.name || '');
    setDraftEmergencyPhone(currentPatient.emergencyContact?.phone || '');
    setDraftEmergencyRelation(currentPatient.emergencyContact?.relation || '');
    setIsEditingPersonal(true);
  };

  const cancelEditingPersonal = () => {
    setIsEditingPersonal(false);
  };

  const saveEditingPersonal = async () => {
    const nameVal = validatePersianName(draftName, 'نام بیمار');
    if (!nameVal.isValid) {
      alert(nameVal.error);
      return;
    }
    const mobileVal = validateIranianMobile(draftMobile);
    if (!mobileVal.isValid) {
      alert(mobileVal.error);
      return;
    }
    if (draftNationalId && draftNationalId.trim()) {
      const natVal = validateIranianNationalId(draftNationalId, true);
      if (!natVal.isValid) {
        alert(natVal.error);
        return;
      }
    }

    setIsSavingPersonal(true);
    try {
      // 1. Update patient personal info
      await patientsApi.updatePatient(currentPatient.id, {
        name: nameVal.normalized,
        mobile: mobileVal.normalized,
        nationalId: draftNationalId.trim() || null,
        birthDate: draftBirthDate.trim() || null,
        gender: (draftGender as any) || null,
        medicalNotes: draftMedicalNotes.trim() || null,
        emergencyContact: {
          name: draftEmergencyName.trim() || null,
          phone: draftEmergencyPhone.trim() || null,
          relation: draftEmergencyRelation.trim() || null
        }
      });

      // 2. Update physical file numbers if changed
      if (hasDental && draftDentalFile.trim() !== getPhysicalFileNumber(currentPatient, 'dental')) {
        const val = validatePhysicalFileNumber(draftDentalFile, false);
        if (!val.isValid) {
          alert(`خطا در شماره پرونده دندانپزشکی: ${val.error}`);
          setIsSavingPersonal(false);
          return;
        }
        await patientsApi.updatePhysicalFileNumber(currentPatient.id, 'dental', val.normalized);
      }

      if (hasAesthetic && draftAestheticFile.trim() !== getPhysicalFileNumber(currentPatient, 'aesthetic')) {
        const val = validatePhysicalFileNumber(draftAestheticFile, false);
        if (!val.isValid) {
          alert(`خطا در شماره پرونده زیبایی: ${val.error}`);
          setIsSavingPersonal(false);
          return;
        }
        await patientsApi.updatePhysicalFileNumber(currentPatient.id, 'aesthetic', val.normalized);
      }

      await refreshPatients();
      setIsEditingPersonal(false);
    } catch (err: any) {
      alert(err.message || 'خطا در ویرایش اطلاعات بیمار');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // Filter patient specific data based on chosen detailScope
  const patientAppointments = appointments.filter(a => {
    if (a.patientId !== currentPatient.id) return false;
    if (detailScope === 'unified') return true;
    return a.practice === detailScope;
  });

  const patientTransactions = transactions.filter(t => {
    if (t.patientId !== currentPatient.id) return false;
    if (detailScope === 'unified') return true;
    return t.practice === detailScope;
  });

  // Total spent & paid calculations for selected scope
  const totalSpent = patientTransactions.reduce((sum, t) => sum + t.netCost, 0);
  const totalPaid = patientTransactions.filter(t => t.trxType === 'payment').reduce((sum, t) => sum + t.paidAmount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {currentPatient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold">{currentPatient.name}</h2>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[11px] font-semibold">
                  کد ملی: {currentPatient.nationalId ? toFarsiDigits(currentPatient.nationalId) : 'ثبت نشده'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>موبایل: {toFarsiDigits(currentPatient.mobile)}</span>
                <span>•</span>
                <span className="font-semibold text-slate-300">عضویت در مطب‌ها:</span>
                <div className="flex items-center gap-1.5">
                  {hasDental && (
                    <span className="px-2 py-0.5 bg-teal-900/90 text-teal-200 border border-teal-700/60 rounded text-[10px] font-bold flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-teal-400" />
                      <span>دندانپزشکی ({toFarsiDigits(getPhysicalFileNumber(currentPatient, 'dental') || '-')})</span>
                    </span>
                  )}
                  {hasAesthetic && (
                    <span className="px-2 py-0.5 bg-purple-900/90 text-purple-200 border border-purple-700/60 rounded text-[10px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>زیبایی ({toFarsiDigits(getPhysicalFileNumber(currentPatient, 'aesthetic') || '-')})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* Scope Selector Bar */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
              <span className="text-[11px] font-bold text-slate-300 ml-1 hidden sm:inline">نمایش:</span>
              <select
                value={detailScope}
                onChange={(e) => setDetailScope(e.target.value as any)}
                className="bg-slate-900 text-white text-xs font-bold rounded-lg px-2.5 py-1 outline-none border border-slate-700 cursor-pointer"
              >
                {hasDental && hasAesthetic && (
                  <option value="unified">همه مطب‌ها</option>
                )}
                {hasDental && (
                  <option value="dental">مطب دندانپزشکی</option>
                )}
                {hasAesthetic && (
                  <option value="aesthetic">مطب زیبایی</option>
                )}
              </select>
            </div>

            {/* Balance Badge */}
            <div className="text-left bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-400 font-semibold">وضعیت حساب بیمار:</p>
              <p className={`text-xs font-black ${
                currentPatient.balance < 0 ? 'text-rose-400' : currentPatient.balance > 0 ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {currentPatient.balance < 0 && `بدهکار (${formatCurrency(Math.abs(currentPatient.balance))})`}
                {currentPatient.balance > 0 && `بستانکار (${formatCurrency(currentPatient.balance)})`}
                {currentPatient.balance === 0 && 'تسویه کامل'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>گردش حساب و امور مالی</span>
          </button>

          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'basic'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>اطلاعات پایه و پزشکی</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>سوابق نوبت‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('treatments')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'treatments'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>درمان‌ها و یادداشت‌های پزشک</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Financial Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              
              {/* Financial KPI bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">مجموع خدمات ({detailScope === 'unified' ? 'همه مطب‌ها' : detailScope === 'dental' ? 'دندانپزشکی' : 'زیبایی'}):</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(totalSpent)}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">مجموع پرداختی‌های قطعی:</span>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-semibold">مانده بدهی سررسیدشده:</span>
                    <p className={`text-sm font-bold mt-0.5 ${currentPatient.balance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {currentPatient.balance < 0 ? formatCurrency(Math.abs(currentPatient.balance)) : '۰ تومان'}
                    </p>
                  </div>
                  {currentPatient.balance < 0 && (
                    <button
                      onClick={() => {
                        const targetTrx = patientTransactions.find(t => t.remainingDebt > 0);
                        openPaymentCollection(currentPatient, targetTrx || null, targetTrx?.practice || (detailScope === 'unified' ? 'aesthetic' : detailScope));
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs text-xs cursor-pointer"
                    >
                      + ثبت دریافت وجه
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[450px] overflow-y-auto shadow-2xs">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">تاریخ ثبت</th>
                      {detailScope === 'unified' && <th className="py-2.5 px-3">مطب</th>}
                      <th className="py-2.5 px-3">خدمت ارائه شده</th>
                      <th className="py-2.5 px-3">مبلغ کل</th>
                      <th className="py-2.5 px-3">تخفیف</th>
                      <th className="py-2.5 px-3">مبلغ دریافتی</th>
                      <th className="py-2.5 px-3 text-rose-600">بدهی باقیمانده</th>
                      <th className="py-2.5 px-3">حساب</th>
                      <th className="py-2.5 px-3">سررسید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patientTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={detailScope === 'unified' ? 9 : 8} className="py-8 text-center text-slate-400 font-semibold">
                          هیچ تراکنش مالی در این محدوده انتخاب‌شده یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      patientTransactions.map(t => (
                        <tr key={t.id} className={t.remainingDebt > 0 ? "hover:bg-rose-50/40" : "hover:bg-slate-50"}>
                          <td className="py-3 px-3 font-bold text-slate-800">{formatJalaliDateDisplay(t.date)}</td>
                          {detailScope === 'unified' && (
                            <td className="py-3 px-3">
                              {t.practice === 'aesthetic' ? (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-bold text-[10px]">زیبایی</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded font-bold text-[10px]">دندانپزشکی</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-3 font-bold text-slate-900">{t.serviceName}</td>
                          <td className="py-3 px-3">{formatCurrency(t.totalCost)}</td>
                          <td className="py-3 px-3 text-slate-500">{formatCurrency(t.discount)}</td>
                          <td className="py-3 px-3 font-bold text-emerald-600">{formatCurrency(t.paidAmount)}</td>
                          <td className="py-3 px-3 font-bold text-rose-600">
                            {t.remainingDebt > 0 ? formatCurrency(t.remainingDebt) : '۰'}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">{t.posAccount}</td>
                          <td className="py-3 px-3 font-bold text-slate-700 dir-ltr text-right">
                            {t.debtDueDate ? formatJalaliDateDisplay(t.debtDueDate) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: Basic Info & Editable Physical File Numbers */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Header Action Bar for Edit Mode */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>اطلاعات فردی و شماره پرونده‌های فیزیکی</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {isEditingPersonal 
                      ? 'در حال ویرایش مسوده (Draft) اطلاعات بیمار. برای ثبت نهایی روی ذخیره کلیک کنید.' 
                      : 'مشاهده مشخصات بیمار و پرونده‌های فیزیکی اختصاص داده شده در مطب‌ها'}
                  </p>
                </div>

                <div>
                  {isEditingPersonal ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEditingPersonal}
                        disabled={isSavingPersonal}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSavingPersonal ? 'در حال ذخیره...' : 'ذخیره تغییرات (Save)'}</span>
                      </button>

                      <button
                        onClick={cancelEditingPersonal}
                        disabled={isSavingPersonal}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-500" />
                        <span>انصراف (Cancel)</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingPersonal}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-4 h-4 text-indigo-600" />
                      <span>ویرایش اطلاعات پرونده</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditingPersonal ? (
                /* DRAFT EDIT FORM */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs">
                  
                  {/* Left Column: Personal Info Inputs */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-xs text-indigo-900 border-b border-slate-200 pb-2">ویرایش مشخصات فردی</h4>
                    
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی بیمار:</label>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="نام و نام خانوادگی..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">شماره همراه (موبایل):</label>
                      <input
                        type="text"
                        value={draftMobile}
                        onChange={(e) => setDraftMobile(e.target.value)}
                        placeholder="09123456789"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">کد ملی (۱۰ رقم):</label>
                      <input
                        type="text"
                        value={draftNationalId}
                        onChange={(e) => setDraftNationalId(e.target.value)}
                        placeholder="کد ملی ۱۰ رقمی..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">تاریخ تولد (هجری شمسی):</label>
                      <input
                        type="text"
                        value={draftBirthDate}
                        onChange={(e) => setDraftBirthDate(e.target.value)}
                        placeholder="مثال: 1370/05/12"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    {hasDental && (
                      <div>
                        <label className="block font-bold text-teal-800 mb-1">شماره پرونده فیزیکی دندانپزشکی:</label>
                        <input
                          type="text"
                          value={draftDentalFile}
                          onChange={(e) => setDraftDentalFile(e.target.value)}
                          placeholder="شماره پرونده دندانپزشکی..."
                          className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-xs font-bold text-teal-900 outline-none focus:border-teal-500"
                        />
                      </div>
                    )}

                    {hasAesthetic && (
                      <div>
                        <label className="block font-bold text-purple-800 mb-1">شماره پرونده فیزیکی زیبایی:</label>
                        <input
                          type="text"
                          value={draftAestheticFile}
                          onChange={(e) => setDraftAestheticFile(e.target.value)}
                          placeholder="شماره پرونده زیبایی..."
                          className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-purple-900 outline-none focus:border-purple-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Medical Notes & Emergency Contact Inputs */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-xs text-indigo-900 border-b border-slate-200 pb-2">تماس اضطراری و یادداشت پزشکی</h4>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">نام فرد تماس اضطراری:</label>
                      <input
                        type="text"
                        value={draftEmergencyName}
                        onChange={(e) => setDraftEmergencyName(e.target.value)}
                        placeholder="نام تماس اضطراری..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">شماره تماس اضطراری:</label>
                        <input
                          type="text"
                          value={draftEmergencyPhone}
                          onChange={(e) => setDraftEmergencyPhone(e.target.value)}
                          placeholder="شماره تماس..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dir-ltr text-right"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">نسبت:</label>
                        <input
                          type="text"
                          value={draftEmergencyRelation}
                          onChange={(e) => setDraftEmergencyRelation(e.target.value)}
                          placeholder="مثال: همسر / پدر"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">یادداشت سوابق پزشکی:</label>
                      <textarea
                        rows={4}
                        value={draftMedicalNotes}
                        onChange={(e) => setDraftMedicalNotes(e.target.value)}
                        placeholder="سوابق بیماری، توضیحات پزشکی یا آلرژی..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                </div>
              ) : (
                /* NORMAL DISPLAY READ-ONLY VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                  
                  {/* Left Column: Personal Info & Practice File Numbers */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">مشخصات هویتی و شماره پرونده‌ها</h4>
                    
                    <p className="py-1">
                      نام و نام خانوادگی: <strong className="text-slate-900 font-extrabold">{currentPatient.name}</strong>
                    </p>

                    <p className="py-1">
                      شناسه داخلی سیستم: <strong className="text-indigo-600 font-mono">{currentPatient.id}</strong>
                    </p>

                    {hasDental && (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-semibold">شماره پرونده فیزیکی دندانپزشکی: </span>
                        <strong className="text-teal-700 font-bold text-sm dir-ltr inline-block">
                          {getPhysicalFileNumber(currentPatient, 'dental') ? toFarsiDigits(getPhysicalFileNumber(currentPatient, 'dental')) : 'ثبت نشده'}
                        </strong>
                      </div>
                    )}

                    {hasAesthetic && (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-semibold">شماره پرونده فیزیکی زیبایی: </span>
                        <strong className="text-purple-700 font-bold text-sm dir-ltr inline-block">
                          {getPhysicalFileNumber(currentPatient, 'aesthetic') ? toFarsiDigits(getPhysicalFileNumber(currentPatient, 'aesthetic')) : 'ثبت نشده'}
                        </strong>
                      </div>
                    )}

                    <div className="py-1">
                      <span>کد ملی: </span>
                      <strong className="text-slate-800">
                        {currentPatient.nationalId ? toFarsiDigits(currentPatient.nationalId) : 'ثبت نشده'}
                      </strong>
                    </div>

                    <p className="py-1">
                      شماره موبایل: <strong>{toFarsiDigits(currentPatient.mobile)}</strong>
                    </p>

                    <div className="py-1">
                      <span>تاریخ تولد: </span>
                      <strong className="text-slate-800">
                        {currentPatient.birthDate ? formatJalaliDateDisplay(currentPatient.birthDate) : 'ثبت نشده'}
                      </strong>
                    </div>

                    <p className="py-1">
                      تاریخ تشکیل پرونده: <strong>{currentPatient.createdAt ? formatJalaliDateDisplay(currentPatient.createdAt) : '-'}</strong>
                    </p>
                  </div>

                  {/* Right Column: Medical Notes & Contacts */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">اطلاعات اضطراری و حساسیت‌ها</h4>
                    
                    <div className="py-1">
                      <span>تماس اضطراری: </span>
                      <strong className="text-slate-800">
                        {currentPatient.emergencyContact && currentPatient.emergencyContact.name ? (
                          `${currentPatient.emergencyContact.name} (${currentPatient.emergencyContact.relation || '-'}) - ${toFarsiDigits(currentPatient.emergencyContact.phone)}`
                        ) : (
                          'ثبت نشده'
                        )}
                      </strong>
                    </div>
                    
                    <div>
                      <span className="font-bold block mb-1 text-slate-800">حساسیت‌های دارویی / پزشکی:</span>
                      {currentPatient.allergies && currentPatient.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {currentPatient.allergies.map((alg, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {alg}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 block">
                          هیچ حساسیتی ثبت نشده است
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="font-bold block mb-1 text-slate-800">یادداشت سوابق پزشکی:</span>
                      <p className="p-2.5 rounded-xl leading-relaxed bg-white border border-slate-200 text-slate-600">
                        {currentPatient.medicalNotes || 'توضیحات خاصی ثبت نشده است.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Appointment History */}
          {activeTab === 'appointments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">
                  تاریخچه نوبت‌های بیمار ({detailScope === 'unified' ? 'همه مطب‌ها' : detailScope === 'dental' ? 'مطب دندانپزشکی' : 'مطب زیبایی'})
                </h3>
                <button
                  onClick={() => {
                    onClose();
                    openNewAppointment({ patient: currentPatient });
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  + رزرو نوبت جدید
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">تاریخ نوبت</th>
                      <th className="py-2.5 px-3">ساعت</th>
                      {detailScope === 'unified' && <th className="py-2.5 px-3">مطب</th>}
                      <th className="py-2.5 px-3">پزشک معالج</th>
                      <th className="py-2.5 px-3">خدمت</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patientAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={detailScope === 'unified' ? 6 : 5} className="py-8 text-center text-slate-400 font-semibold">
                          هیچ نوبتی در این محدوده ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      patientAppointments.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">{formatJalaliDateDisplay(a.date)}</td>
                          <td className="py-3 px-3 font-bold text-indigo-600 dir-ltr text-right">{toFarsiDigits(a.timeSlot)}</td>
                          {detailScope === 'unified' && (
                            <td className="py-3 px-3">
                              {a.practice === 'aesthetic' ? (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-bold text-[10px]">زیبایی</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded font-bold text-[10px]">دندانپزشکی</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-3">{a.doctorName}</td>
                          <td className="py-3 px-3">{a.serviceName || 'ویزیت'}</td>
                          <td className="py-3 px-3">
                            {a.status === 'completed' && <span className="text-emerald-600 font-bold">تکمیل‌شده</span>}
                            {a.status === 'pending' && <span className="text-amber-600 font-bold">در انتظار</span>}
                            {a.status === 'checked_in' && <span className="text-blue-600 font-bold">حاضر</span>}
                            {a.status === 'unsettled' && <span className="text-rose-600 font-bold">بلاتکلیف مالی</span>}
                            {a.status === 'canceled' && <span className="text-rose-600 font-bold">لغوشده</span>}
                            {a.status === 'rescheduled' && <span className="text-indigo-600 font-bold">جابجا شده</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Treatments & Doctor Notes */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              
              {/* Doctor Log Entry Input */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800">ثبت شرح درمان جدید توسط پزشک</h3>
                <textarea
                  rows={3}
                  value={newDoctorNote}
                  onChange={(e) => setNewDoctorNote(e.target.value)}
                  placeholder="توضیحات فنی درمان، شماره دندان یا زون تزریق..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
                
                {/* Upload simulation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>آپلود عکس رادیوگرافی X-Ray / تصویر قبل و بعد</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!newDoctorNote) return;
                      alert('یادداشت درمان با موفقیت در پرونده دیجیتال بیمار ثبت گردید.');
                      setNewDoctorNote('');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ثبت در پرونده
                  </button>
                </div>
              </div>

              {/* Timeline logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">تاریخچه درمان‌های ثبت‌شده:</h4>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 font-bold border-b border-slate-100 pb-2">
                    <span>ثبت‌شده درتاریخ ۱۰ شهریور ۱۴۰۵ توسط دکتر رمضانی</span>
                    <span className="text-indigo-600">مطب زیبایی</span>
                  </div>
                  <p className="pt-2 text-slate-800 leading-relaxed font-medium">
                    تزریق ۱ سی‌سی ژل هیالورونیک لب با تکنیک ناتشورال. روتوش پس از ۱۴ روز انجام خواهد شد. بیمار هیچگونه عارضه جانبی ثبت نکرد.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
