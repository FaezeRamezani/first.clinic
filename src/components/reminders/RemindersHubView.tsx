import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { 
  Users, 
  AlertCircle, 
  HelpCircle, 
  PhoneCall, 
  Search
} from 'lucide-react';

export const RemindersHubView: React.FC = () => {
  const { 
    scope, 
    appointments, 
    patients, 
    followUps, 
    remindersTab,
    setRemindersTab,
    openPaymentCollection, 
    openQuickCheckout,
    openFollowUpModal,
    openPatientProfile
  } = useClinic();

  const activeTab = remindersTab;
  const setActiveTab = setRemindersTab;
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Filtered Data per Scope
  const filteredAppointments = appointments.filter(a => scope === 'unified' || a.practice === scope);
  const filteredPatients = patients.filter(p => scope === 'unified' || p.primaryPractice === scope);
  const filteredFollowUps = followUps.filter(f => scope === 'unified' || f.practice === scope);

  // Tab 1: Today Visits
  const todayVisits = filteredAppointments.filter(a => a.date === '۱۴۰۵-۰۶-۱۶');
  
  // Tab 2: Overdue Debts (Patients with balance < 0)
  const overdueDebtors = filteredPatients.filter(p => p.balance < 0);

  // Tab 3: Unsettled past visits
  const unsettledVisits = filteredAppointments.filter(a => a.status === 'unsettled');

  // Tab 4: Secretary Follow-ups
  const secretaryFollowUps = filteredFollowUps;

  // Global search filtering inside tabs
  const matchSearch = (name: string, mobile: string, fileNo: string) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || mobile.includes(q) || fileNo.toLowerCase().includes(q);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">مرکز یادآورها، اقساط و پیگیری‌های روزانه کلینیک</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              جدول اقدام عملیاتی منشی جهت تسویه بدهی‌ها، نوبت‌های بلاتکلیف و پیگیری‌های پس از درمان
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="فیلتر نام بیمار، شماره پرونده یا موبایل..."
              className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-1.5 text-xs font-semibold text-slate-800 outline-none w-64 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 4 Multi-Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          
          <button
            onClick={() => setActiveTab('today_visits')}
            className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
              activeTab === 'today_visits'
                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-bold'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs">نوبت‌های امروز</span>
            </div>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[10px] font-bold rounded-full">
              {toFarsiDigits(todayVisits.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overdue_debts')}
            className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
              activeTab === 'overdue_debts'
                ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-bold'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span className="text-xs">بدهی‌های سررسیدشده</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-200 text-rose-900 text-[10px] font-bold rounded-full">
              {toFarsiDigits(overdueDebtors.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unsettled_visits')}
            className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
              activeTab === 'unsettled_visits'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs">مراجعات بلاتکلیف مالی</span>
            </div>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-full">
              {toFarsiDigits(unsettledVisits.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('secretary_calls')}
            className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
              activeTab === 'secretary_calls'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-indigo-600" />
              <span className="text-xs">پیگیری‌ها و تماس‌ها</span>
            </div>
            <span className="px-2 py-0.5 bg-indigo-200 text-indigo-900 text-[10px] font-bold rounded-full">
              {toFarsiDigits(secretaryFollowUps.filter(f => f.status === 'pending').length)} معوق
            </span>
          </button>

        </div>
      </div>

      {/* Main Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* TAB 1: Today Visits */}
        {activeTab === 'today_visits' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">ساعت</th>
                  <th className="py-3 px-4">شماره پرونده</th>
                  <th className="py-3 px-4">نام بیمار</th>
                  <th className="py-3 px-4">موبایل</th>
                  <th className="py-3 px-4">پزشک / کابین</th>
                  <th className="py-3 px-4">وضعیت ورود</th>
                  <th className="py-3 px-4 text-center">پرونده / تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {todayVisits
                  .filter(a => matchSearch(a.patientName, a.patientMobile, a.fileNumber))
                  .map(apt => (
                    <tr key={apt.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dir-ltr text-right">{toFarsiDigits(apt.timeSlot)}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{toFarsiDigits(apt.fileNumber)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <button
                          onClick={() => openPatientProfile(apt.patientId)}
                          className="hover:text-indigo-600 hover:underline text-right font-bold transition-colors"
                        >
                          {apt.patientName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">{toFarsiDigits(apt.patientMobile)}</td>
                      <td className="py-3.5 px-4">{apt.doctorName} ({apt.cabinetNumber || 'اتاق ۱'})</td>
                      <td className="py-3.5 px-4">
                        {apt.status === 'pending' && <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">در انتظار</span>}
                        {apt.status === 'checked_in' && <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">حاضر در مطب</span>}
                        {apt.status === 'completed' && <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold text-[10px]">تکمیل‌شده</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openQuickCheckout(apt)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px]"
                        >
                          ثبت تسویه
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Overdue Debts */}
        {activeTab === 'overdue_debts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">شماره پرونده</th>
                  <th className="py-3 px-4">نام بیمار بدهکار</th>
                  <th className="py-3 px-4">شماره تماس</th>
                  <th className="py-3 px-4">مطب مربوطه</th>
                  <th className="py-3 px-4 text-rose-600">مبلغ بدهی / قسط معوقه</th>
                  <th className="py-3 px-4 text-center">عملیات وصولی فوری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {overdueDebtors
                  .filter(p => matchSearch(p.name, p.mobile, p.fileNumber))
                  .map(pat => (
                    <tr key={pat.id} className="hover:bg-rose-50/40">
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{toFarsiDigits(pat.fileNumber)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => openPatientProfile(pat)}
                          className="hover:text-indigo-600 hover:underline text-right font-bold transition-colors"
                        >
                          {pat.name}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{toFarsiDigits(pat.mobile)}</td>
                      <td className="py-3.5 px-4 font-semibold">
                        {pat.primaryPractice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'}
                      </td>
                      <td className="py-3.5 px-4 font-black text-rose-600 text-sm">
                        {formatCurrency(Math.abs(pat.balance))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openPaymentCollection(pat)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                        >
                          ثبت دریافت وجه / تسویه
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Unsettled Visits */}
        {activeTab === 'unsettled_visits' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">تاریخ مراجعه</th>
                  <th className="py-3 px-4">نام بیمار</th>
                  <th className="py-3 px-4">پزشک معالج</th>
                  <th className="py-3 px-4">خدمت ارائه شده</th>
                  <th className="py-3 px-4">علت بلاتکلیفی</th>
                  <th className="py-3 px-4 text-center">تسویه دستی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {unsettledVisits
                  .filter(a => matchSearch(a.patientName, a.patientMobile, a.fileNumber))
                  .map(apt => (
                    <tr key={apt.id} className="hover:bg-amber-50/40">
                      <td className="py-3.5 px-4 text-amber-900 font-bold">{apt.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => openPatientProfile(apt.patientId)}
                          className="hover:text-indigo-600 hover:underline text-right font-bold transition-colors"
                        >
                          {apt.patientName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">{apt.doctorName}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{apt.serviceName || 'خدمت تخصصی'}</td>
                      <td className="py-3.5 px-4 text-amber-800">{apt.notes || 'فراموشی منشی در ثبت دریافتی'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openQuickCheckout(apt)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs"
                        >
                          تعیین تکلیف و تسویه
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: Secretary Calls & Follow-ups */}
        {activeTab === 'secretary_calls' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">تاریخ سررسید</th>
                  <th className="py-3 px-4">نام بیمار</th>
                  <th className="py-3 px-4">موبایل</th>
                  <th className="py-3 px-4">نوع پیگیری</th>
                  <th className="py-3 px-4">توضیحات ماموریت</th>
                  <th className="py-3 px-4">آخرین نتیجه</th>
                  <th className="py-3 px-4 text-center">ثبت نتیجه تماس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {secretaryFollowUps
                  .filter(f => matchSearch(f.patientName, f.patientMobile, f.fileNumber))
                  .map(task => (
                    <tr key={task.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{task.dueDate}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => openPatientProfile(task.patientId)}
                          className="hover:text-indigo-600 hover:underline text-right font-bold transition-colors"
                        >
                          {task.patientName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{toFarsiDigits(task.patientMobile)}</td>
                      <td className="py-3.5 px-4">
                        {task.type === 'debt_reminder' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">یادآوری قسط</span>}
                        {task.type === 'post_op' && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px]">پیگیری پس از درمان</span>}
                        {task.type === 'lab_result' && <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold text-[10px]">نتیجه لابراتوار</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate">{task.description}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {task.resultNote || 'هنوز تماسی انجام نشده'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openFollowUpModal(task)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 mx-auto"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ثبت وضعیت پیگیری</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
