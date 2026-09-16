import React, { useState } from 'react';
import { useClinic, hasPracticeMembership, getPatientFileNumberDisplay, getPhysicalFileNumber } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, formatJalaliDateDisplay, getTodayJalaliDate, toEnglishDigits } from '../../utils/persianUtils';
import { 
  History, 
  ShieldCheck,
  Eye,
  Search,
  X
} from 'lucide-react';
import { ExpensesLogTab } from './ExpensesLogTab';

export const FinanceView: React.FC = () => {
  const { 
    scope, 
    userRole, 
    transactions, 
    patients, 
    openPaymentCollection, 
    openPatientProfile,
    dashboardDate
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'transactions' | 'debts' | 'expenses'>('transactions');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [isPatientPickerOpen, setIsPatientPickerOpen] = useState<boolean>(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');

  const filteredPatientsList = patients.filter(p => {
    const scopeMatch = hasPracticeMembership(p, scope);
    if (!scopeMatch && scope !== 'unified') return false;
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const dentalFile = getPhysicalFileNumber(p, 'dental');
    const aestheticFile = getPhysicalFileNumber(p, 'aesthetic');
    return (
      p.name.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      (p.fileNumber && p.fileNumber.toLowerCase().includes(q)) ||
      dentalFile.includes(q) ||
      aestheticFile.includes(q) ||
      (p.nationalId && p.nationalId.includes(q))
    );
  });

  const todayJalali = getTodayJalaliDate();
  const selectedDate = dashboardDate || todayJalali;
  const normSelDate = toEnglishDigits(selectedDate).trim().replace(/\//g, '-');

  // Scope & Account Filtered Transactions
  const filteredTransactions = transactions.filter(t => {
    const scopeMatch = scope === 'unified' || t.practice === scope;
    const accountMatch = selectedAccountFilter === 'all' || t.posAccount.includes(selectedAccountFilter);
    return scopeMatch && accountMatch;
  });

  // const filteredExpenses = expenses.filter(e => scope === 'unified' || e.practice === scope || e.practice === 'unified');
  const debtorsList = patients.filter(p => {
    const scopeMatch = hasPracticeMembership(p, scope);
    if (!scopeMatch) return false;
    return p.balance < 0 || transactions.some(t => t.patientId === p.id && (t.remainingDebt > 0 || t.lastActionDate === selectedDate || t.debtDueDate !== undefined));
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Role Notice Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-300">سطح دسترسی فعال:</span>
              <span className="text-xs font-black px-2 py-0.5 bg-indigo-600 rounded text-white">
                {userRole === 'admin_doctor' ? 'پزشک مدیر (مشاهده سود خالص کلینیک)' : 'منشی پذیرش (ثبت دریافتی و کارتخوان)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تفکیک کامل حساب کارتخوان مطب زیبایی و مطب دندانپزشکی بر اساس تراکنش
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPatientSearchQuery('');
              setIsPatientPickerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>ثبت دستی مبالغ گذشته</span>
          </button>
        </div>
      </div>

      {/* POS Account Filter & Tabs Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'transactions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            دفتر تراکنش‌ها و دریافتی‌ها ({toFarsiDigits(filteredTransactions.length)})
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'debts' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مدیریت بدهی‌ها و اقساط معوقه ({toFarsiDigits(debtorsList.length)})
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'expenses' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            دفتر هزینه‌ها
          </button>
        </div>

        {/* Account Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">فیلتر حساب کارتخوان:</span>
          <select
            value={selectedAccountFilter}
            onChange={(e) => setSelectedAccountFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none"
          >
            <option value="all">همه حساب‌ها / کارتخوان‌ها</option>
            <option value="سامان">کارتخوان بانک سامان (مطب زیبایی)</option>
            <option value="پاسارگاد">کارتخوان بانک پاسارگاد (مطب دندانپزشکی)</option>
            <option value="ملی">حساب کارت به کارت (بانک ملی)</option>
          </select>
        </div>

      </div>

      {/* TAB 1: Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">تاریخ ثبت</th>
                  <th className="py-3 px-4">نام بیمار</th>
                  <th className="py-3 px-4">شماره پرونده</th>
                  <th className="py-3 px-4">خدمت ارائه شده</th>
                  <th className="py-3 px-4">مطب مربوطه</th>
                  <th className="py-3 px-4">هزینه کل</th>
                  <th className="py-3 px-4">تخفیف</th>
                  <th className="py-3 px-4 text-emerald-600">پرداختی قطعی</th>
                  <th className="py-3 px-4 text-rose-600">بدهی باقیمانده</th>
                  <th className="py-3 px-4">حساب کارتخوان مقصد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{formatJalaliDateDisplay(trx.date)}</td>
                    <td 
                      className="py-3.5 px-4 font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors" 
                      onClick={() => openPatientProfile(trx.patientId)}
                      title="مشاهده پرونده بیمار"
                    >
                      {trx.patientName}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600 font-mono">
                      {toFarsiDigits(
                        (() => {
                          const p = patients.find(pat => pat.id === trx.patientId);
                          return p ? getPatientFileNumberDisplay(p, trx.practice) : (trx.fileNumber || '-');
                        })()
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{trx.serviceName}</td>
                    <td className="py-3.5 px-4">
                      {trx.practice === 'aesthetic' ? (
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px]">زیبایی</span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded font-semibold text-[10px]">دندانپزشکی</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{formatCurrency(trx.totalCost)}</td>
                    <td className="py-3.5 px-4 text-slate-400">{formatCurrency(trx.discount)}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{formatCurrency(trx.paidAmount)}</td>
                    <td className="py-3.5 px-4 font-bold text-rose-600">
                      {trx.remainingDebt > 0 ? formatCurrency(trx.remainingDebt) : '۰'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{trx.posAccount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Debts Management */}
      {activeTab === 'debts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">شماره پرونده</th>
                  <th className="py-3 px-4">نام بیمار بدهکار</th>
                  <th className="py-3 px-4">خدمت / عنوان بدهی</th>
                  <th className="py-3 px-4">مطب مربوطه</th>
                  <th className="py-3 px-4">مبلغ خدمت</th>
                  <th className="py-3 px-4 text-emerald-700">پرداختی تا کنون</th>
                  <th className="py-3 px-4 text-rose-600">مانده بدهی</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-4 text-center">عملیات پرونده / تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {debtorsList.map((pat) => {
                  const patTrxs = transactions.filter(t => t.patientId === pat.id);
                  const targetTrx = patTrxs.find(t => t.trxType !== 'payment' && (t.remainingDebt > 0 || t.lastActionDate === selectedDate)) || patTrxs.find(t => t.trxType !== 'payment');
                  const linkedPayments = targetTrx 
                    ? patTrxs.filter(t => t.trxType === 'payment' && (t.obligationId === targetTrx.id || (t.appointmentId && t.appointmentId === targetTrx.appointmentId)))
                    : patTrxs.filter(t => t.trxType === 'payment');

                  const totalPaidSoFar = (targetTrx ? targetTrx.paidAmount : 0) + linkedPayments.reduce((sum, p) => sum + p.paidAmount, 0);
                  const liveRemainingDebt = targetTrx ? Math.max(0, targetTrx.netCost - totalPaidSoFar) : (pat.balance < 0 ? Math.abs(pat.balance) : 0);

                  const targetPractice = targetTrx ? targetTrx.practice : pat.primaryPractice;
                  const isAesthetic = targetPractice === 'aesthetic';
                  const serviceTitle = targetTrx ? targetTrx.serviceName : 'بدهی پرونده بیمار';
                  const originalCost = targetTrx ? targetTrx.netCost : Math.abs(pat.balance);

                  const isSettled = pat.balance >= 0 || liveRemainingDebt === 0;
                  const isPartial = liveRemainingDebt > 0 && totalPaidSoFar > 0;

                  const latestPayment = linkedPayments[0];
                  const latestDueDate = latestPayment?.debtDueDate || targetTrx?.debtDueDate;
                  const latestActionDate = latestPayment?.lastActionDate || targetTrx?.lastActionDate;

                  const normDueDate = latestDueDate ? toEnglishDigits(latestDueDate).trim().replace(/\//g, '-') : '';
                  const isFutureScheduled = !!(normDueDate && normDueDate > normSelDate);
                  const isActedToday = latestActionDate === selectedDate;

                  // Muted gray if settled OR if action for current due date was already performed (future date set or acted today)
                  const isMutedGray = isSettled || isFutureScheduled || isActedToday;

                  const rowClass = isMutedGray
                    ? 'bg-slate-100/80 text-slate-400 opacity-70 border-r-4 border-r-slate-400'
                    : isPartial
                    ? 'bg-amber-50/40 hover:bg-amber-50/70 border-r-4 border-r-amber-500'
                    : 'hover:bg-rose-50/40 border-r-4 border-r-rose-500';

                  return (
                    <tr key={pat.id} className={`${rowClass} transition-colors`}>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{getPatientFileNumberDisplay(pat, targetPractice)}</td>
                      <td 
                        className="py-3.5 px-4 font-bold hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                        onClick={() => openPatientProfile(pat)}
                        title="مشاهده پرونده بیمار"
                      >
                        {pat.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{serviceTitle}</td>
                      <td className="py-3.5 px-4 font-semibold">
                        {isAesthetic ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded text-[10px] font-bold">زیبایی (دکتر رمضانی)</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded text-[10px] font-bold">دندانپزشکی (دکتر آخرتی)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold">{formatCurrency(originalCost)}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{formatCurrency(totalPaidSoFar)}</td>
                      <td className="py-3.5 px-4 font-black text-rose-600 text-sm">
                        {formatCurrency(liveRemainingDebt)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isSettled ? (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-bold text-[10px]">تسویه کامل</span>
                        ) : isMutedGray ? (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[10px]" title={latestDueDate ? `تاریخ سررسید بعدی: ${latestDueDate}` : ''}>
                            تعیین‌تکلیف‌شده (سررسید {latestDueDate ? toFarsiDigits(latestDueDate) : ''})
                          </span>
                        ) : isPartial ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">پرداخت جزئی</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-900 rounded font-bold text-[10px]">بدهی فعال</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openPatientProfile(pat)}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="مشاهده پرونده بیمار"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>پرونده</span>
                          </button>
                          {!isSettled ? (
                            <button
                              onClick={() => openPaymentCollection(pat, targetTrx || null, targetPractice)}
                              className={`px-3.5 py-1.5 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer ${
                                isMutedGray 
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isMutedGray ? 'تغییر / ثبت سررسید' : '+ ثبت دریافت وجه'}
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold">تسویه‌شده</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Expenses Log */}
      {activeTab === 'expenses' && <ExpensesLogTab />}

      {/* Patient Selection Modal for "ثبت دستی مبالغ گذشته" */}
      {isPatientPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">ثبت دستی مبالغ گذشته — انتخاب بیمار</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  لطفاً بیمار مورد نظر را جهت ثبت دریافت یا بدهی گذشته انتخاب کنید.
                </p>
              </div>
              <button onClick={() => setIsPatientPickerOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <input
                type="text"
                autoFocus
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                placeholder="جستجوی بیمار بر اساس نام، شماره پرونده، کد ملی یا همراه..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pr-9 pl-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            {/* Patient Results List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {filteredPatientsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  هیچ بیماری با این مشخصات یافت نشد.
                </div>
              ) : (
                filteredPatientsList.map((p) => {
                  const targetPractice = scope === 'unified' ? (p.primaryPractice || 'aesthetic') : scope;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setIsPatientPickerOpen(false);
                        openPaymentCollection(p, null, targetPractice);
                      }}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 rounded-2xl flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 group-hover:text-indigo-700">{p.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              p.primaryPractice === 'aesthetic' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {p.primaryPractice === 'aesthetic' ? 'زیبایی' : 'دندانپزشکی'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 dir-ltr">
                            پرونده: {toFarsiDigits(getPatientFileNumberDisplay(p, targetPractice))} | {toFarsiDigits(p.mobile)}
                          </p>
                        </div>
                      </div>

                      <div className="text-left">
                        {p.balance < 0 ? (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                            بدهکار: {formatCurrency(Math.abs(p.balance))}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            تسویه کامل
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setIsPatientPickerOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
