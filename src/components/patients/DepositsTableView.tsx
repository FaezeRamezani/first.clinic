import React, { useState, useMemo } from 'react';
import { useClinic, getPhysicalFileNumber } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import {
  Search,
  Plus,
  FileText,
  Sparkles,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CreditCard
} from 'lucide-react';
import type { Deposit, DepositStatus } from '../../types';

export const DepositsTableView: React.FC = () => {
  const {
    scope,
    deposits,
    patients,
    appointments,
    openDepositDetail,
    openNewDeposit
  } = useClinic();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DepositStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter deposits based on scope, search query, and status
  const filteredDeposits = useMemo(() => {
    return deposits.filter(dep => {
      // 1. Scope filter
      if (scope !== 'unified' && dep.practice !== scope) {
        return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all' && dep.status !== statusFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patient = patients.find(p => p.id === dep.patientId);
        const patientName = patient?.name.toLowerCase() || '';
        const patientMobile = patient?.mobile || '';
        const nationalId = patient?.nationalId || '';
        const aestheticNo = patient ? getPhysicalFileNumber(patient, 'aesthetic') : '';
        const dentalNo = patient ? getPhysicalFileNumber(patient, 'dental') : '';
        const fileNo = patient?.fileNumber || '';
        const notes = dep.notes?.toLowerCase() || '';

        const match =
          patientName.includes(q) ||
          patientMobile.includes(q) ||
          nationalId.includes(q) ||
          aestheticNo.includes(q) ||
          dentalNo.includes(q) ||
          fileNo.toLowerCase().includes(q) ||
          notes.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [deposits, scope, statusFilter, searchQuery, patients]);

  // Pagination
  const totalItems = filteredDeposits.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedDeposits = filteredDeposits.slice(startIndex, startIndex + pageSize);

  // Status badge helper
  const renderStatusBadge = (status: DepositStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>بیعانه فعال</span>
          </span>
        );
      case 'partially_allocated':
      case 'partially_applied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>تخصیص جزئی</span>
          </span>
        );
      case 'fully_allocated':
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            <span>اعمال‌شده روی خدمت</span>
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>مسترد شده</span>
          </span>
        );
      case 'partially_refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>استرداد جزئی</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Appointment status & date helper
  const renderAppointmentInfo = (deposit: Deposit) => {
    if (!deposit.appointmentId) {
      return {
        dateDisplay: <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">تعیین نشده</span>,
        statusDisplay: <span className="text-slate-500 font-medium text-[11px]">در انتظار تعیین نوبت</span>
      };
    }

    const apt = appointments.find(a => a.id === deposit.appointmentId);
    if (!apt) {
      return {
        dateDisplay: <span className="text-slate-500 text-[11px]">ثبت‌شده ({deposit.appointmentId})</span>,
        statusDisplay: <span className="text-slate-400 text-[11px]">-</span>
      };
    }

    let statusPill = null;
    if (apt.status === 'pending' || apt.status === 'checked_in') {
      statusPill = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <Calendar className="w-3 h-3 text-sky-500" />
          <span>نوبت قطعی</span>
        </span>
      );
    } else if (apt.status === 'completed') {
      statusPill = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>مراجعه انجام شد</span>
        </span>
      );
    } else if (apt.status === 'canceled') {
      statusPill = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title="بیعانه با لغو نوبت حفظ شده است">
          <XCircle className="w-3 h-3 text-rose-500" />
          <span>نوبت لغو شده</span>
        </span>
      );
    } else {
      statusPill = <span className="text-slate-600 text-[11px]">{apt.status}</span>;
    }

    return {
      dateDisplay: (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-xs">{toFarsiDigits(apt.date)}</span>
          <span className="text-[10px] text-slate-500">ساعت {toFarsiDigits(apt.timeSlot)}</span>
        </div>
      ),
      statusDisplay: statusPill
    };
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>مدیریت بیعانه‌های بیماران</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            ثبت، پیگیری، تخصیص به خدمات و استرداد مبالغ بیعانه مراجعات آینده
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو با نام، موبایل، شماره پرونده..."
              className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-1.5 text-xs font-semibold text-slate-800 outline-none w-64 focus:border-indigo-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | DepositStatus);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer pr-1 pl-2"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">بیعانه فعال</option>
              <option value="partially_allocated">تخصیص جزئی</option>
              <option value="fully_allocated">اعمال‌شده روی خدمت</option>
              <option value="refunded">مسترد شده</option>
              <option value="partially_refunded">استرداد جزئی</option>
            </select>
          </div>

          {/* Register New Deposit Button */}
          <button
            onClick={() => openNewDeposit()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ دریافت بیعانه جدید</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>تعداد بیعانه‌ها:</span>
            <span className="font-black text-indigo-900">{toFarsiDigits(totalItems)}</span>
          </div>

          {scope !== 'unified' && (
            <span className="text-xs text-slate-500 font-medium">
              (محدود به {scope === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'})
            </span>
          )}
        </div>
      </div>

      {/* Deposits 9-Column Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <th className="py-3.5 px-4">۱. شماره پرونده</th>
                <th className="py-3.5 px-4">۲. نام و نام خانوادگی</th>
                <th className="py-3.5 px-4">۳. مبلغ بیعانه</th>
                <th className="py-3.5 px-4">۴. مطب</th>
                <th className="py-3.5 px-4">۵. تاریخ پرداخت</th>
                <th className="py-3.5 px-4">۶. تاریخ نوبت</th>
                <th className="py-3.5 px-4">۷. وضعیت نوبت</th>
                <th className="py-3.5 px-4">۸. وضعیت بیعانه</th>
                <th className="py-3.5 px-4 text-center">۹. عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedDeposits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="w-8 h-8 text-slate-300" />
                      <span>هیچ بیعانه‌ای با شرایط انتخابی یافت نشد.</span>
                      {(statusFilter !== 'all' || searchQuery) && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                          className="mt-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          پاک کردن فیلترها و جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDeposits.map((dep) => {
                  const patient = patients.find(p => p.id === dep.patientId);
                  const aestheticNo = patient ? getPhysicalFileNumber(patient, 'aesthetic') : '';
                  const dentalNo = patient ? getPhysicalFileNumber(patient, 'dental') : '';
                  const aptInfo = renderAppointmentInfo(dep);

                  return (
                    <tr
                      key={dep.id}
                      onClick={() => openDepositDetail(dep)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      {/* 1. شماره پرونده */}
                      <td className="py-3.5 px-4 dir-ltr text-right">
                        {patient ? (
                          aestheticNo && dentalNo ? (
                            <div className="flex flex-col gap-0.5 text-[11px]">
                              <span className="font-bold text-indigo-600">زیبایی: {toFarsiDigits(aestheticNo)}</span>
                              <span className="font-bold text-teal-600">دندان: {toFarsiDigits(dentalNo)}</span>
                            </div>
                          ) : aestheticNo ? (
                            <span className="font-bold text-indigo-600">زیبایی: {toFarsiDigits(aestheticNo)}</span>
                          ) : dentalNo ? (
                            <span className="font-bold text-teal-600">دندان: {toFarsiDigits(dentalNo)}</span>
                          ) : (
                            <span className="font-bold text-slate-700">{toFarsiDigits(patient.fileNumber || '-')}</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 2. نام و نام خانوادگی */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {patient ? patient.name.charAt(0) : '؟'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {patient ? patient.name : 'بیمار نامشخص'}
                            </span>
                            {patient?.mobile && (
                              <span className="text-[10px] text-slate-400 dir-ltr block text-right">
                                {toFarsiDigits(patient.mobile)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. مبلغ بیعانه */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">
                            {formatCurrency(dep.remainingAmount)}
                          </span>
                          {dep.remainingAmount !== dep.initialAmount && (
                            <span className="text-[10px] text-slate-400">
                              (اصل: {formatCurrency(dep.initialAmount)})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. مطب */}
                      <td className="py-3.5 px-4">
                        {dep.practice === 'aesthetic' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] border border-indigo-200">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span>مطب زیبایی</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 font-bold rounded-lg text-[11px] border border-teal-200">
                            <Stethoscope className="w-3 h-3 text-teal-500" />
                            <span>مطب دندانپزشکی</span>
                          </span>
                        )}
                      </td>

                      {/* 5. تاریخ پرداخت بیعانه */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {toFarsiDigits(dep.paymentDate)}
                      </td>

                      {/* 6. تاریخ نوبت */}
                      <td className="py-3.5 px-4">
                        {aptInfo.dateDisplay}
                      </td>

                      {/* 7. وضعیت نوبت */}
                      <td className="py-3.5 px-4">
                        {aptInfo.statusDisplay}
                      </td>

                      {/* 8. وضعیت بیعانه */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(dep.status)}
                      </td>

                      {/* 9. عملیات */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDepositDetail(dep)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-300" />
                          <span>پرونده بیعانه</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600 font-semibold">
            <div>
              <span>نمایش </span>
              <span className="font-bold text-slate-800">{toFarsiDigits(startIndex + 1)}</span>
              <span> تا </span>
              <span className="font-bold text-slate-800">{toFarsiDigits(Math.min(startIndex + pageSize, totalItems))}</span>
              <span> از کل </span>
              <span className="font-bold text-slate-800">{toFarsiDigits(totalItems)}</span>
              <span> بیعانه</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5"
              >
                <ChevronRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>

              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800">
                صفحه {toFarsiDigits(activePage)} از {toFarsiDigits(totalPages)}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
