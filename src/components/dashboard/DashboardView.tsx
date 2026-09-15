import React from 'react';
import {
  Globe,
  CheckCircle2,
  Sparkles,
  Stethoscope,
  Receipt,
  UserCheck,
  CreditCard,
  CalendarX,
  XCircle,
  Users
} from 'lucide-react';
import { useClinic, hasPracticeMembership, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate, toEnglishDigits, formatJalaliDateDisplay } from '../../utils/persianUtils';
import type { PresenceStatus, Appointment } from '../../types';

export const DashboardView: React.FC = () => {
  const {
    scope,
    appointments,
    patients,
    onlineRequests,
    transactions,
    updateAppointmentPresenceStatus,
    openQuickCheckout,
    openPaymentCollection,
    openCancelAppointment,
    openPatientProfile,
    setActiveView,
    setAppointmentsTab,
    dashboardDate
  } = useClinic();

  // 1. Filter data by current global practice scope
  const filteredAppointments = appointments.filter(a => scope === 'unified' || a.practice === scope);
  const filteredPatients = patients.filter(p => hasPracticeMembership(p, scope));
  const filteredOnlineRequests = onlineRequests.filter(r => scope === 'unified' || r.targetPractice === scope);

  // 2. Operational Summary Metrics & Strict Date Filter
  const todayJalali = getTodayJalaliDate();
  const selectedDate = dashboardDate || todayJalali;
  const isToday = selectedDate === todayJalali;

  const normSelectedDate = toEnglishDigits(selectedDate).trim().replace(/\//g, '-');

  const todayAppointments = filteredAppointments
    .filter(a => {
      const normAptDate = toEnglishDigits(a.date).trim().replace(/\//g, '-');
      return normAptDate === normSelectedDate;
    })
    .sort((a, b) => {
      const timeA = toEnglishDigits(a.timeSlot || '').trim();
      const timeB = toEnglishDigits(b.timeSlot || '').trim();
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB, undefined, { numeric: true });
      }
      return (a.id || '').localeCompare(b.id || '');
    });

  const activeTodayAppointments = todayAppointments.filter(a => a.status !== 'canceled' && a.status !== 'rescheduled');
  const completedCount = activeTodayAppointments.filter(a => a.status === 'completed').length;
  const nonCompletedActive = activeTodayAppointments.filter(a => a.status !== 'completed');

  const presentCount = nonCompletedActive.filter(a =>
    a.presenceStatus === 'present' || (a.status === 'checked_in' && a.presenceStatus !== 'absent')
  ).length;

  const absentCount = nonCompletedActive.length - presentCount;

  // Helper to resolve current active due date and live remaining debt of a Financial Obligation
  const getObligationActiveDetails = (ob: any, allTrxs: any[]) => {
    const linkedPayments = allTrxs.filter(t => 
      t.trxType === 'payment' && 
      (t.obligationId === ob.id || (ob.appointmentId && t.appointmentId === ob.appointmentId))
    );

    const totalPaidOnObligation = (ob.paidAmount || 0) + linkedPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const remainingDebt = Math.max(0, (ob.netCost || 0) - totalPaidOnObligation);

    const latestPayment = linkedPayments[0];
    const activeDueDate = (latestPayment && latestPayment.debtDueDate) ? latestPayment.debtDueDate : ob.debtDueDate;

    return {
      ob,
      linkedPayments,
      remainingDebt,
      activeDueDate
    };
  };

  // Daily debtors for selectedDate (shows active debts whose current active due date matches selectedDate EXACTLY)
  const overdueDebtors = filteredPatients.filter(p => {
    const pObTrxs = transactions.filter(t => t.patientId === p.id && t.trxType !== 'payment');
    if (pObTrxs.length === 0) return false;

    const activeObsDueSelectedDate = pObTrxs.map(ob => getObligationActiveDetails(ob, transactions)).filter(info => {
      if (info.remainingDebt <= 0) return false;
      const normDueDate = info.activeDueDate ? toEnglishDigits(info.activeDueDate).trim().replace(/\//g, '-') : '';
      return normDueDate === normSelectedDate;
    });

    return activeObsDueSelectedDate.length > 0;
  });



  // Pending Online Requests
  const pendingOnlineRequests = filteredOnlineRequests.filter(r => r.status === 'pending');

  // Presence & Status Renderer for Dashboard Table
  const renderPresenceButton = (apt: Appointment) => {
    if (apt.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>تکمیل</span>
        </span>
      );
    }

    if (apt.status === 'rescheduled') {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>نوبت جدید</span>
          </span>
          {apt.cancellationReason && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
              {apt.cancellationReason}
            </span>
          )}
        </div>
      );
    }

    if (apt.status === 'canceled') {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>لغو شد</span>
          </span>
          {apt.cancellationReason && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
              {apt.cancellationReason}
            </span>
          )}
        </div>
      );
    }

    const isPresent = apt.presenceStatus === 'present' || (apt.status === 'checked_in' && apt.presenceStatus !== 'absent');

    const handleTogglePresence = (e: React.MouseEvent) => {
      e.stopPropagation();

      const nextStatus: PresenceStatus = isPresent ? 'absent' : 'present';
      updateAppointmentPresenceStatus(apt.id, nextStatus);
    };

    if (isPresent) {
      return (
        <button
          type="button"
          onClick={handleTogglePresence}
          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-extrabold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
          title='برای تغییر به "عدم حضور" کلیک کنید'
        >
          <UserCheck className="w-3 h-3 text-emerald-600" />
          <span>حضور</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleTogglePresence}
        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 font-extrabold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
        title='برای تغییر به "حضور" کلیک کنید'
      >
        <XCircle className="w-3 h-3 text-rose-600" />
        <span>عدم حضور</span>
      </button>
    );
  };

  return (
    <div className="space-y-5 pb-12">

      {/* Operational Summary Cards (Fully Clickable & Interactive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Card 1: Today's / Selected Date Appointments */}
        <div
          onClick={() => {
            setAppointmentsTab('schedule');
            setActiveView('appointments');
          }}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
              {isToday ? 'نوبتهای امروز' : `نوبتهای ${formatJalaliDateDisplay(selectedDate)}`}
            </span>

            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-xl font-black text-slate-800">
              {toFarsiDigits(activeTodayAppointments.length)}
              <span className="text-xs font-medium text-slate-500 mr-1">نوبت</span>
            </div>

            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold flex-wrap">
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                {toFarsiDigits(presentCount)} حاضر
              </span>

              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded">
                {toFarsiDigits(absentCount)} عدم حضور
              </span>

              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                {toFarsiDigits(completedCount)} انجامشده
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Online Requests */}
        <div
          onClick={() => {
            setAppointmentsTab('online_requests');
            setActiveView('appointments');
          }}
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

      </div>

      {/* Main Operational Tables Grid — Responsive 2 Columns (xl:grid-cols-2 min-w-0) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-w-0">

        {/* Table 1: Today's Appointments & Operational Flow */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  {isToday ? 'نوبت‌های امروز' : `نوبت‌های ${formatJalaliDateDisplay(selectedDate)}`}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-xs">
                  {toFarsiDigits(todayAppointments.length)} نوبت
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {isToday ? 'جریان عملیاتی امروز' : `جریان عملیاتی ${formatJalaliDateDisplay(selectedDate)}`}
              </span>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                {isToday
                  ? 'هیچ نوبتی برای مطب انتخابی در تاریخ امروز ثبت نشده است.'
                  : `هیچ نوبتی برای مطب انتخابی در تاریخ ${formatJalaliDateDisplay(selectedDate)} ثبت نشده است.`}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs text-right border-collapse min-w-[500px]">
                  <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                    <tr className="text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 whitespace-nowrap">ساعت</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">بیمار و تماس</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">شماره پرونده</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">مطب</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">وضعیت حضور</th>
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
                            <p
                              onClick={() => openPatientProfile(apt.patientId)}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                              title="مشاهده پرونده بیمار"
                            >
                              {apt.patientName}
                            </p>
                            <p className="text-[11px] text-slate-700 font-semibold dir-ltr text-right">
                              {toFarsiDigits(apt.patientMobile)}
                            </p>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-700 dir-ltr text-right whitespace-nowrap">
                            {toFarsiDigits(
                              (() => {
                                const p = patients.find(pat => pat.id === apt.patientId);
                                return p ? getPatientFileNumberDisplay(p, apt.practice) : (apt.fileNumber || '-');
                              })()
                            )}
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
                          </td>
                          {/* 3-Step Presence Cycle Button (Section 10 & 11) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderPresenceButton(apt)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {apt.status !== 'completed' && apt.status !== 'canceled' && apt.status !== 'rescheduled' && (
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
                                <span className="text-[10px] text-slate-500 font-bold">تسویه‌شده</span>
                              )}
                              {apt.status === 'rescheduled' && (
                                <span className="text-[10px] text-slate-500 font-bold">انتقال‌یافته</span>
                              )}
                              {apt.status === 'canceled' && (
                                <span className="text-[10px] text-slate-500 font-bold">لغوشده</span>
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
              <span className="text-[11px] text-slate-400 font-medium">
                {isToday ? 'اقدام امروز' : `اقدام ${formatJalaliDateDisplay(selectedDate)}`}
              </span>
            </div>

            {overdueDebtors.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                {isToday
                  ? 'هیچ بدهی سررسیدشده یا معوقه‌ای برای مطب انتخابی وجود ندارد.'
                  : `هیچ بدهی سررسیدشده‌ای برای مطب انتخابی در تاریخ ${formatJalaliDateDisplay(selectedDate)} ثبت نشده است.`}
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
                      const pObTrxs = transactions.filter(t => t.patientId === patient.id && t.trxType !== 'payment');
                      const activeObsDueSelectedDate = pObTrxs.map(ob => getObligationActiveDetails(ob, transactions)).filter(info => {
                        if (info.remainingDebt <= 0) return false;
                        const normDueDate = info.activeDueDate ? toEnglishDigits(info.activeDueDate).trim().replace(/\//g, '-') : '';
                        return normDueDate === normSelectedDate;
                      });

                      const allPatientActiveObs = pObTrxs.map(ob => getObligationActiveDetails(ob, transactions)).filter(info => info.remainingDebt > 0);
                      const liveRemainingDebt = allPatientActiveObs.reduce((sum, info) => sum + info.remainingDebt, 0);

                      const primaryTargetInfo = activeObsDueSelectedDate[0] || (pObTrxs[0] ? getObligationActiveDetails(pObTrxs[0], transactions) : null);
                      const targetTrx = primaryTargetInfo ? primaryTargetInfo.ob : null;
                      const targetPractice = targetTrx ? targetTrx.practice : patient.primaryPractice;
                      const isAesthetic = targetPractice === 'aesthetic';

                      const rowClass = isAesthetic
                        ? 'bg-purple-100/70 hover:bg-purple-100/90 border-r-4 border-r-purple-600 text-purple-950 font-medium'
                        : 'bg-teal-100/70 hover:bg-teal-100/90 border-r-4 border-r-teal-600 text-teal-950 font-medium';

                      return (
                        <tr key={patient.id} className={`${rowClass} transition-colors`}>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <p
                              onClick={() => openPatientProfile(patient)}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                              title="مشاهده پرونده بیمار"
                            >
                              {patient.name}
                            </p>
                            <p className="text-[11px] text-slate-600 font-semibold dir-ltr text-right">
                              {toFarsiDigits(patient.mobile)}
                            </p>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-700 dir-ltr text-right whitespace-nowrap">
                            {toFarsiDigits(getPatientFileNumberDisplay(patient, targetPractice))}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isAesthetic ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-900 text-[10px] font-bold">
                                <Sparkles className="w-3 h-3 text-purple-700" />
                                <span>زیبایی (دکتر رمضانی)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-200/80 text-teal-900 text-[10px] font-bold">
                                <Stethoscope className="w-3 h-3 text-teal-700" />
                                <span>دندانپزشکی (دکتر آخرتی)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-black text-rose-700 text-xs whitespace-nowrap">
                            {formatCurrency(liveRemainingDebt)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openPaymentCollection(patient, targetTrx || null, targetPractice)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="ثبت دریافت وجه"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>ثبت پرداخت</span>
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
