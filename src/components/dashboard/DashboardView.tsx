import React from 'react';
import { 
  Users, 
  AlertCircle, 
  HelpCircle, 
  CreditCard, 
  Plus, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Stethoscope, 
  Receipt,
  UserCheck
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const DashboardView: React.FC = () => {
  const { 
    scope, 
    appointments, 
    patients, 
    transactions, 
    updateAppointmentStatus, 
    openQuickCheckout,
    setIsNewAppointmentOpen,
    setActiveView
  } = useClinic();

  // Filter data by current scope
  const filteredAppointments = appointments.filter(a => scope === 'unified' || a.practice === scope);
  const filteredTransactions = transactions.filter(t => scope === 'unified' || t.practice === scope);
  const filteredPatients = patients.filter(p => scope === 'unified' || p.primaryPractice === scope);

  // 1. KPI Calculations
  const todayAppointments = filteredAppointments.filter(a => a.date === '۱۴۰۵-۰۶-۱۶');
  const checkedInCount = todayAppointments.filter(a => a.status === 'checked_in').length;
  const pendingCount = todayAppointments.filter(a => a.status === 'pending').length;
  const completedCount = todayAppointments.filter(a => a.status === 'completed').length;
  const totalTodayApts = todayAppointments.length;

  // Overdue Debts due today
  const overdueDebtors = filteredPatients.filter(p => p.balance < 0);
  const totalOverdueAmount = overdueDebtors.reduce((sum, p) => sum + Math.abs(p.balance), 0);

  // Unsettled Visits (past days)
  const unsettledVisits = filteredAppointments.filter(a => a.status === 'unsettled');

  // Today's Total Cash & POS Revenue
  const todayTransactions = filteredTransactions.filter(t => t.date === '۱۴۰۵-۰۶-۱۶');
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.paidAmount, 0);

  // Revenue chart data split by practice
  const aestheticRevenue = transactions.filter(t => t.practice === 'aesthetic').reduce((sum, t) => sum + t.paidAmount, 0);
  const dentalRevenue = transactions.filter(t => t.practice === 'dental').reduce((sum, t) => sum + t.paidAmount, 0);

  const chartData = [
    { name: 'مطب ۱ (زیبایی)', revenue: aestheticRevenue / 1000000, color: '#6366F1' },
    { name: 'مطب ۲ (دندانپزشکی)', revenue: dentalRevenue / 1000000, color: '#0D9488' }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Quick Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">داشبورد کنترل عملیاتی کلینیک</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            بررسی زنده نوبت‌های امروز، تسویه‌ها و مطالبات سررسیدشده
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewAppointmentOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ نوبت جدید امروز</span>
          </button>
          <button
            onClick={() => setActiveView('reminders')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            <span>کارتابل پیگیری‌ها</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today Appointments */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نوبت‌های امروز</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {toFarsiDigits(totalTodayApts)} <span className="text-xs font-medium text-slate-500">مراجعه</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                {toFarsiDigits(checkedInCount)} حاضر
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                {toFarsiDigits(pendingCount)} در انتظار
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                {toFarsiDigits(completedCount)} انجام‌شده
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Debts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مطالبات سررسیدشده</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-rose-600">
              {formatCurrency(totalOverdueAmount)}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              مربوط به {toFarsiDigits(overdueDebtors.length)} بیمار دارای اقساط معوقه
            </p>
          </div>
        </div>

        {/* Card 3: Unsettled Visits */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ویزیت‌های بلاتکلیف مالی</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              {toFarsiDigits(unsettledVisits.length)} <span className="text-xs font-medium text-slate-500">پرونده</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              خدمات ثبت‌شده بدون ثبت هزینه/تسویه
            </p>
          </div>
        </div>

        {/* Card 4: Today Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">درآمد نقدی/کارتخوان امروز</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600">
              {formatCurrency(todayRevenue)}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              مجموع تراکنش‌های دریافتی قطعی امروز
            </p>
          </div>
        </div>

      </div>

      {/* Main Content Grid: Today's Active Schedule & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Active Schedule Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">برنامه پذیرش و جریان عملیاتی امروز</h3>
              <p className="text-xs text-slate-500">مدیریت سریع وضعیت ورود و ثبت بلافاصله تسویه ویزیت</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-xs">
              {toFarsiDigits(todayAppointments.length)} نوبت
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              هیچ نوبتی برای این مطب در تاریخ امروز ثبت نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 rounded-r-lg">ساعت</th>
                    <th className="py-2.5 px-3">بیمار</th>
                    <th className="py-2.5 px-3">مطب / پزشک</th>
                    <th className="py-2.5 px-3">خدمت درخواستی</th>
                    <th className="py-2.5 px-3">وضعیت حضور</th>
                    <th className="py-2.5 px-3 rounded-l-lg text-center">عملیات تسویه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {todayAppointments.map((apt) => {
                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dir-ltr text-right">
                          {toFarsiDigits(apt.timeSlot)}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{apt.patientName}</p>
                          <p className="text-[10px] text-slate-400">{toFarsiDigits(apt.fileNumber)}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {apt.practice === 'aesthetic' ? (
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            ) : (
                              <Stethoscope className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px]">{apt.doctorName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {apt.serviceName || 'ویزیت اولیه'}
                        </td>
                        <td className="py-3 px-3">
                          {/* Status Badge Buttons */}
                          <div className="flex items-center gap-1">
                            {apt.status === 'pending' && (
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'checked_in')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                <span>ثبت ورود</span>
                              </button>
                            )}
                            {apt.status === 'checked_in' && (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                <span>حاضر در مطب</span>
                              </span>
                            )}
                            {apt.status === 'completed' && (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>تکمیل و تسویه</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {apt.status === 'completed' ? (
                            <span className="text-[10px] text-slate-400">تسویه‌شده</span>
                          ) : (
                            <button
                              onClick={() => openQuickCheckout(apt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 mx-auto"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>ثبت ویزیت / تسویه</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Practice Revenue Split & Quick Shortcuts (1 Col) */}
        <div className="space-y-6">
          
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">تفکیک درآمد کل مطب‌ها (میلیون تومان)</h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip 
                    formatter={(val: any) => [`${toFarsiDigits(val)} میلیون تومان`, 'درآمد کل']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>درآمد زیبایی: {formatCurrency(aestheticRevenue)}</span>
              <span>درآمد دندانپزشکی: {formatCurrency(dentalRevenue)}</span>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">راهنمای سرعت منشی پذیرش</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              جهت جلوگیری از تجمع در صف پذیرش، با کلیک روی دکمه «ثبت ویزیت / تسویه»، کلیه مراحل انتخاب خدمت، اعمال تخفیف، دریافت کارتخوان و ثبت بدهی در یک پنجره انجام می‌شود.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
