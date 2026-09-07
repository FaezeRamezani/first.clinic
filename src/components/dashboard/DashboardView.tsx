import React from 'react';
import { 
  Users, 
  AlertCircle, 
  HelpCircle, 
  Globe, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Stethoscope, 
  Receipt,
  UserCheck,
  CreditCard,
  PhoneCall,
  ArrowRight,
  CalendarX
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate } from '../../utils/persianUtils';

export const DashboardView: React.FC = () => {
  const { 
    scope, 
    appointments, 
    patients, 
    onlineRequests,
    followUps,
    updateAppointmentStatus, 
    openQuickCheckout,
    openPaymentCollection,
    openCancelAppointment,
    setActiveView,
    setRemindersTab
  } = useClinic();

  // 1. Filter data by current global practice scope
  const filteredAppointments = appointments.filter(a => scope === 'unified' || a.practice === scope);
  const filteredPatients = patients.filter(p => scope === 'unified' || p.primaryPractice === scope);
  const filteredOnlineRequests = onlineRequests.filter(r => scope === 'unified' || r.targetPractice === scope);
  const filteredFollowUps = followUps.filter(f => scope === 'unified' || f.practice === scope);

  // 2. Operational Summary Metrics
  const todayJalali = getTodayJalaliDate();
  const todayAppointments = filteredAppointments.filter(a => a.date === todayJalali || a.date === '۱۴۰۵-۰۶-۱۶');
  const checkedInCount = todayAppointments.filter(a => a.status === 'checked_in').length;
  const pendingCount = todayAppointments.filter(a => a.status === 'pending').length;
  const completedCount = todayAppointments.filter(a => a.status === 'completed').length;

  // Overdue debtor patients (only remaining debt > 0 / balance < 0, fully settled excluded)
  const overdueDebtors = filteredPatients.filter(p => p.balance < 0);
  const totalOverdueAmount = overdueDebtors.reduce((sum, p) => sum + Math.abs(p.balance), 0);

  // Unsettled Visits (past days)
  const unsettledVisits = filteredAppointments.filter(a => a.status === 'unsettled');

  // Pending Online Requests
  const pendingOnlineRequests = filteredOnlineRequests.filter(r => r.status === 'pending');

  // Pending Secretary Tasks
  const pendingFollowUps = filteredFollowUps.filter(f => f.status === 'pending');

  return (
    <div className="space-y-5 pb-12">
      
      {/* Operational Summary Cards (Fully Clickable & Interactive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Card 1: Today Appointments */}
        <div 
          onClick={() => setActiveView('appointments')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">نوبت‌های امروز</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">
              {toFarsiDigits(todayAppointments.length)} <span className="text-xs font-medium text-slate-500">نوبت</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold flex-wrap">
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                {toFarsiDigits(checkedInCount)} حاضر
              </span>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                {toFarsiDigits(pendingCount)} منتظر
              </span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                {toFarsiDigits(completedCount)} انجام‌شده
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Debts */}
        <div 
          onClick={() => {
            setRemindersTab('overdue_debts');
            setActiveView('reminders');
          }}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-rose-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-rose-600 transition-colors">مطالبات سررسیدشده</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-rose-600 truncate">
              {formatCurrency(totalOverdueAmount)}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {toFarsiDigits(overdueDebtors.length)} بیمار بدهکار معوق
            </p>
          </div>
        </div>

        {/* Card 3: Unsettled Visits */}
        <div 
          onClick={() => {
            setRemindersTab('unsettled_visits');
            setActiveView('reminders');
          }}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-amber-600 transition-colors">ویزیت‌های بلاتکلیف</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-amber-600">
              {toFarsiDigits(unsettledVisits.length)} <span className="text-xs font-medium text-slate-500">پرونده</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              خدمات بدون تسویه مالی
            </p>
          </div>
        </div>

        {/* Card 4: Online Requests */}
        <div 
          onClick={() => setActiveView('appointments')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">درخواست‌های آنلاین</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-indigo-600">
              {toFarsiDigits(pendingOnlineRequests.length)} <span className="text-xs font-medium text-slate-500">درخواست</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              نیازمند تایید/تعیین زمان
            </p>
          </div>
        </div>

        {/* Card 5: Secretary Tasks */}
        <div 
          onClick={() => {
            setRemindersTab('secretary_calls');
            setActiveView('reminders');
          }}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-purple-600 transition-colors">پیگیری‌ها و تماس‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-purple-600">
              {toFarsiDigits(pendingFollowUps.length)} <span className="text-xs font-medium text-slate-500">ماموریت</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              تماس‌های یادآوری امروز
            </p>
          </div>
        </div>

      </div>

      {/* Main Operational Tables Grid — Responsive 2 Columns (xl:grid-cols-2 min-w-0) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-w-0">
        
        {/* Table 1: Today's Appointments & Operational Flow */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">نوبت‌های امروز</h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-xs">
                  {toFarsiDigits(todayAppointments.length)} نوبت
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">جریان عملیاتی امروز</span>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                هیچ نوبتی برای مطب انتخابی در تاریخ امروز ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs text-right border-collapse min-w-[500px]">
                  <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                    <tr className="text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 whitespace-nowrap">ساعت</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">بیمار و تماس</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">شماره پرونده</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">مطب / پزشک</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">وضعیت</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {todayAppointments.map((apt) => {
                      const isAesthetic = apt.practice === 'aesthetic';
                      // Clear visible warmer practice row tint
                      const rowClass = isAesthetic 
                        ? 'bg-purple-100/70 hover:bg-purple-100/90 border-r-4 border-r-purple-600 text-purple-950' 
                        : 'bg-teal-100/70 hover:bg-teal-100/90 border-r-4 border-r-teal-600 text-teal-950';

                      return (
                        <tr key={apt.id} className={`${rowClass} transition-colors`}>
                          <td className="py-3 px-3 font-bold text-slate-900 dir-ltr text-right shrink-0 whitespace-nowrap">
                            {toFarsiDigits(apt.timeSlot)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <p className="font-bold text-slate-900">{apt.patientName}</p>
                            <p className="text-[11px] text-slate-700 font-semibold dir-ltr text-right">
                              {toFarsiDigits(apt.patientMobile)}
                            </p>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-700 dir-ltr text-right whitespace-nowrap">
                            {toFarsiDigits(apt.fileNumber)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {isAesthetic ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-900 text-[10px] font-bold">
                                  <Sparkles className="w-3 h-3 text-purple-700" />
                                  <span>زیبایی</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-200/80 text-teal-900 text-[10px] font-bold">
                                  <Stethoscope className="w-3 h-3 text-teal-700" />
                                  <span>دندانپزشکی</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-700 font-medium truncate max-w-[110px] mt-0.5">
                              {apt.doctorName}
                            </p>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {apt.status === 'pending' && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, 'checked_in')}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>ثبت ورود</span>
                                </button>
                              )}
                              {apt.status === 'checked_in' && (
                                <span className="px-2 py-1 bg-emerald-200 text-emerald-900 font-bold rounded-lg text-[10px] flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  <span>حاضر</span>
                                </span>
                              )}
                              {apt.status === 'completed' && (
                                <span className="px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>تسویه‌شده</span>
                                </span>
                              )}
                              {apt.status === 'canceled' && (
                                <span className="px-2 py-1 bg-rose-200 text-rose-900 font-bold rounded-lg text-[10px]">
                                  لغوشده
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {apt.status !== 'completed' && apt.status !== 'canceled' && (
                                <>
                                  <button
                                    onClick={() => openQuickCheckout(apt)}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                    title="ثبت تسویه مالی"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>تسویه</span>
                                  </button>

                                  <button
                                    onClick={() => openCancelAppointment(apt)}
                                    className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                    title="لغو / تغییر نوبت"
                                  >
                                    <CalendarX className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {apt.status === 'completed' && (
                                <span className="text-[10px] text-slate-500 font-bold">تکمیل</span>
                              )}
                            </div>
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

        {/* Table 2: Unpaid / Due Today Operational Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">بدهی‌ها و مطالبات سررسیدشده</h3>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-xs">
                  {toFarsiDigits(overdueDebtors.length)} پرونده
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">اقدام امروز</span>
            </div>

            {overdueDebtors.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                هیچ بدهی سررسیدشده یا معوقه‌ای برای مطب انتخابی وجود ندارد.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs text-right border-collapse min-w-[500px]">
                  <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                    <tr className="text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 whitespace-nowrap">بیمار و تماس</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">شماره پرونده</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">مطب</th>
                      <th className="py-2.5 px-3 text-rose-700 whitespace-nowrap">باقیمانده</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {overdueDebtors.map((patient) => {
                      const isAesthetic = patient.primaryPractice === 'aesthetic';
                      // Clear visible warmer practice row tint
                      const rowClass = isAesthetic 
                        ? 'bg-purple-100/70 hover:bg-purple-100/90 border-r-4 border-r-purple-600 text-purple-950' 
                        : 'bg-teal-100/70 hover:bg-teal-100/90 border-r-4 border-r-teal-600 text-teal-950';

                      return (
                        <tr key={patient.id} className={`${rowClass} transition-colors`}>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <p className="font-bold text-slate-900">{patient.name}</p>
                            <p className="text-[11px] text-slate-700 font-semibold dir-ltr text-right">
                              {toFarsiDigits(patient.mobile)}
                            </p>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-700 dir-ltr text-right whitespace-nowrap">
                            {toFarsiDigits(patient.fileNumber)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isAesthetic ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-900 text-[10px] font-bold">
                                <Sparkles className="w-3 h-3 text-purple-700" />
                                <span>زیبایی</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-200/80 text-teal-900 text-[10px] font-bold">
                                <Stethoscope className="w-3 h-3 text-teal-700" />
                                <span>دندانپزشکی</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-black text-rose-700 text-xs whitespace-nowrap">
                            {formatCurrency(Math.abs(patient.balance))}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openPaymentCollection(patient)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="ثبت دریافت وجه"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>دریافت وجه</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRemindersTab('secretary_calls');
                                  setActiveView('reminders');
                                }}
                                className="p-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-[10px] transition-colors flex items-center justify-center cursor-pointer"
                                title="پیگیری تلفنی"
                              >
                                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                              </button>
                            </div>
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

      </div>

    </div>
  );
};
