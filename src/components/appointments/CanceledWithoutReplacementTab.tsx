import React, { useState } from 'react';
import { Sparkles, Stethoscope, CalendarPlus, Filter, Search, CalendarX, ArrowUpDown } from 'lucide-react';
import { useClinic, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { toFarsiDigits, toEnglishDigits, formatJalaliDateDisplay } from '../../utils/persianUtils';

export const CanceledWithoutReplacementTab: React.FC = () => {
  const { appointments, scope, openNewAppointment, patients } = useClinic();

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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

    // Search filter (patient name, mobile, file number, date, cancellationReason)
    if (searchTerm.trim()) {
      const term = toEnglishDigits(searchTerm).toLowerCase().trim();
      const nameMatch = a.patientName.toLowerCase().includes(term);
      const mobileMatch = toEnglishDigits(a.patientMobile).includes(term);
      const fileMatch = toEnglishDigits(a.fileNumber).toLowerCase().includes(term);
      const dateMatch = toEnglishDigits(a.date).includes(term);
      const reasonMatch = (a.cancellationReason || '').toLowerCase().includes(term);
      if (!nameMatch && !mobileMatch && !fileMatch && !dateMatch && !reasonMatch) return false;
    }

    return true;
  });

  // Sort by canceledAt or date (Newest / Oldest)
  const sortedCanceled = [...filteredCanceled].sort((a, b) => {
    const dateA = toEnglishDigits(a.canceledAt || a.date).replace(/\//g, '-');
    const dateB = toEnglishDigits(b.canceledAt || b.date).replace(/\//g, '-');
    return sortOrder === 'newest' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  const handleSetNewAppointment = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId) || null;
    openNewAppointment({ patient });
  };

  return (
    <div className="space-y-4">
      
      {/* Section 8: Header Panel (Soft Rose/Slate Theme matching Online Requests card) */}
      <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <CalendarX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-950">کارتابل پیگیری نوبت‌های لغوشده بدون جایگزین</h3>
            <p className="text-xs text-rose-800 font-medium mt-0.5">
              مدیریت و تعیین نوبت مجدد برای بیمارانی که نوبت قبلی آن‌ها کنسلی بدون رزرو زمان جدید بوده است.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-rose-300 shadow-2xs shrink-0">
          <span className="text-xs font-bold text-slate-700">تعداد پرونده‌های لغوشده:</span>
          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-xs rounded-lg">
            {toFarsiDigits(sortedCanceled.length)} مورد
          </span>
        </div>
      </div>

      {/* Section 9: Combinable Filter & Sort Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Sort Control */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">مرتب‌سازی:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="newest">جدیدترین لغو</option>
              <option value="oldest">قدیمی‌ترین لغو</option>
            </select>
          </div>

          {/* Internal Practice Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">فیلتر مطب:</span>
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

        </div>

        {/* Search Input Box */}
        <div className="relative flex items-center w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی بیمار / تاریخ / علت..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pr-8 pl-3 py-1.5 outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Table Structure */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {sortedCanceled.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            هیچ نوبت لغوشده‌ای بدون زمان جایگزین در این فیلتر یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse min-w-[750px]">
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
                        {(() => {
                          const p = patients.find(pat => pat.id === apt.patientId);
                          return p ? getPatientFileNumberDisplay(p, apt.practice) : toFarsiDigits(apt.fileNumber);
                        })()}
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
                        {formatJalaliDateDisplay(apt.date)} - {toFarsiDigits(apt.timeSlot)}
                      </td>
                      <td className="py-3 px-3 text-rose-700 font-bold dir-ltr text-right">
                        {formatJalaliDateDisplay(apt.canceledAt || apt.date)}
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

    </div>
  );
};
