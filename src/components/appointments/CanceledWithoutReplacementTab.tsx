import React, { useState } from 'react';
import { Sparkles, Stethoscope, CalendarPlus, Filter, Search } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';

export const CanceledWithoutReplacementTab: React.FC = () => {
  const { appointments, scope, openNewAppointment, patients } = useClinic();

  const [internalPracticeFilter, setInternalPracticeFilter] = useState<'all' | 'aesthetic' | 'dental'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter canceled appointments with cancellationType === 'no_replacement'
  const filteredCanceled = appointments.filter(a => {
    // Top-level Global Scope check
    const isGlobalScopeMatch = scope === 'unified' || a.practice === scope;
    if (!isGlobalScopeMatch) return false;

    // Must be canceled without replacement
    const isCanceledNoReplacement = a.status === 'canceled' && a.cancellationType === 'no_replacement';
    if (!isCanceledNoReplacement) return false;

    // Internal Practice Filter (does NOT modify global scope)
    if (internalPracticeFilter !== 'all' && a.practice !== internalPracticeFilter) {
      return false;
    }

    // Search filter (patient name, mobile, file number, date)
    if (searchTerm.trim()) {
      const term = toEnglishDigits(searchTerm).toLowerCase().trim();
      const nameMatch = a.patientName.toLowerCase().includes(term);
      const mobileMatch = toEnglishDigits(a.patientMobile).includes(term);
      const fileMatch = toEnglishDigits(a.fileNumber).toLowerCase().includes(term);
      const dateMatch = toEnglishDigits(a.date).includes(term);
      if (!nameMatch && !mobileMatch && !fileMatch && !dateMatch) return false;
    }

    return true;
  });

  // Sort descending by canceledAt or date (newest first)
  const sortedCanceled = [...filteredCanceled].sort((a, b) => {
    const dateA = toEnglishDigits(a.canceledAt || a.date).replace(/\//g, '-');
    const dateB = toEnglishDigits(b.canceledAt || b.date).replace(/\//g, '-');
    return dateB.localeCompare(dateA);
  });

  const handleSetNewAppointment = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId) || null;
    openNewAppointment({ patient });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
      
      {/* Header & Combined Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">نوبت‌های لغوشده بدون نوبت جایگزین</h3>
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-xs">
              {toFarsiDigits(sortedCanceled.length)} مورد
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            کارتابل پیگیری بیمارانی که نوبت آن‌ها لغو گردیده اما هنوز نوبت جایگزین دریافت نکرده‌اند (مرتب‌سازی نزولی)
          </p>
        </div>

        {/* Combinable Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Internal Practice Filter (only affects this list) */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-bold">فیلتر مطب:</span>
            <select
              value={internalPracticeFilter}
              onChange={(e) => setInternalPracticeFilter(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="all">همه مطب‌ها</option>
              <option value="aesthetic">زیبایی</option>
              <option value="dental">دندانپزشکی</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی بیمار / تاریخ..."
              className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pr-8 pl-3 py-1.5 outline-none focus:border-indigo-500 w-44"
            />
          </div>

        </div>
      </div>

      {sortedCanceled.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          هیچ نوبت لغوشده‌ای بدون زمان جایگزین در این فیلتر ثبت نشده است.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3">بیمار</th>
                <th className="py-3 px-3">شماره تماس</th>
                <th className="py-3 px-3">شماره پرونده</th>
                <th className="py-3 px-3">پزشک معالج</th>
                <th className="py-3 px-3">مطب</th>
                <th className="py-3 px-3">تاریخ و ساعت قبلی</th>
                <th className="py-3 px-3">تاریخ لغو</th>
                <th className="py-3 px-3">دلیل لغو</th>
                <th className="py-3 px-3">وضعیت</th>
                <th className="py-3 px-3 text-center">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedCanceled.map((apt) => {
                const isAesthetic = apt.practice === 'aesthetic';
                const rowClass = isAesthetic
                  ? 'bg-purple-50/40 hover:bg-purple-50/70 border-r-4 border-r-purple-500'
                  : 'bg-teal-50/40 hover:bg-teal-50/70 border-r-4 border-r-teal-500';

                return (
                  <tr key={apt.id} className={`${rowClass} transition-colors`}>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {apt.patientName}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700 dir-ltr text-right">
                      {toFarsiDigits(apt.patientMobile)}
                    </td>
                    <td className="py-3 px-3 font-bold text-indigo-600 dir-ltr text-right">
                      {toFarsiDigits(apt.fileNumber)}
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-medium">
                      {apt.doctorName}
                    </td>
                    <td className="py-3 px-3">
                      {isAesthetic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>زیبایی</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
                          <Stethoscope className="w-3 h-3 text-teal-600" />
                          <span>دندانپزشکی</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dir-ltr text-right font-semibold">
                      {toFarsiDigits(apt.date)} - {toFarsiDigits(apt.timeSlot)}
                    </td>
                    <td className="py-3 px-3 text-rose-700 font-bold dir-ltr text-right">
                      {toFarsiDigits(apt.canceledAt || apt.date)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[160px] truncate" title={apt.cancellationReason}>
                      {apt.cancellationReason || 'لغو توسط منشی'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[10px]">
                        بدون نوبت جایگزین
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleSetNewAppointment(apt.patientId)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>تعیین نوبت جدید</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
