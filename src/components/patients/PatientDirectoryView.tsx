import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { 
  Search, 
  Plus, 
  ShieldAlert, 
  Eye, 
  CalendarPlus, 
  CreditCard, 
  Sparkles, 
  Stethoscope 
} from 'lucide-react';
import { PatientDetailModal } from './PatientDetailModal';

export const PatientDirectoryView: React.FC = () => {
  const { 
    scope, 
    patients, 
    setSelectedPatient, 
    selectedPatient, 
    setIsNewPatientOpen, 
    setIsNewAppointmentOpen,
    openPaymentCollection
  } = useClinic();

  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPatients = patients.filter(p => {
    const scopeMatch = scope === 'unified' || p.primaryPractice === scope;
    if (!searchQuery) return scopeMatch;
    const q = searchQuery.toLowerCase();
    return scopeMatch && (
      p.name.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      p.fileNumber.toLowerCase().includes(q) ||
      p.nationalId.includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">بانک جامع پرونده‌های دیجیتال بیماران</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            جستجوی سریع پرونده، سوابق درمان، گردش مالی و وضعیت تسویه بدهی‌ها
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام، موبایل، کد ملی یا پرونده..."
              className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-1.5 text-xs font-semibold text-slate-800 outline-none w-64 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setIsNewPatientOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ تشکیل پرونده جدید</span>
          </button>
        </div>
      </div>

      {/* Mandatory Separation Protection Alert */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs font-medium">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-950 block mb-0.5">قانون ساختاری جداسازی پرونده‌های کلینیک:</strong>
          <span>
            به منظور جلوگیری از خطای پزشکی و تداخل مالی در سیستم متمرکز، پرونده‌های هم‌نام هرگز نباید به صورت خودکار ادغام شوند مگر آنکه شماره موبایل یا کد ملی احراز شده کاملاً یکسان باشد.
          </span>
        </div>
      </div>

      {/* Patient Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3.5 px-4">شماره پرونده</th>
                <th className="py-3.5 px-4">نام و نام خانوادگی</th>
                <th className="py-3.5 px-4">شماره موبایل</th>
                <th className="py-3.5 px-4">کد ملی</th>
                <th className="py-3.5 px-4">مطب اصلی</th>
                <th className="py-3.5 px-4">مانده حساب / تراز</th>
                <th className="py-3.5 px-4 text-center">عملیات پرونده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* File Number */}
                  <td className="py-3.5 px-4 font-bold text-indigo-600 font-mono">
                    {toFarsiDigits(patient.fileNumber)}
                  </td>

                  {/* Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {patient.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">{patient.name}</span>
                    </div>
                  </td>

                  {/* Mobile */}
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {toFarsiDigits(patient.mobile)}
                  </td>

                  {/* National ID */}
                  <td className="py-3.5 px-4 text-slate-500 font-semibold">
                    {toFarsiDigits(patient.nationalId)}
                  </td>

                  {/* Practice */}
                  <td className="py-3.5 px-4">
                    {patient.primaryPractice === 'aesthetic' ? (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                        <Sparkles className="w-3 h-3 text-indigo-500" /> مطب زیبایی
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                        <Stethoscope className="w-3 h-3 text-teal-500" /> دندانپزشکی
                      </span>
                    )}
                  </td>

                  {/* Account Balance */}
                  <td className="py-3.5 px-4">
                    {patient.balance < 0 && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-[11px]">
                        بدهکار ({formatCurrency(Math.abs(patient.balance))})
                      </span>
                    )}
                    {patient.balance > 0 && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]">
                        بستانکار ({formatCurrency(patient.balance)})
                      </span>
                    )}
                    {patient.balance === 0 && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg text-[11px]">
                        تسویه کامل
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      
                      <button
                        onClick={() => setSelectedPatient(patient)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مشاهده پرونده</span>
                      </button>

                      <button
                        onClick={() => setIsNewAppointmentOpen(true)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>نوبت</span>
                      </button>

                      {patient.balance < 0 && (
                        <button
                          onClick={() => openPaymentCollection(patient)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>تسویه</span>
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Patient Digital Profile Drawer */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

    </div>
  );
};
