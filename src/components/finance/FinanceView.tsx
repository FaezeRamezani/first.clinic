import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  History, 
  ShieldCheck 
} from 'lucide-react';
import { ExpensesLogTab } from './ExpensesLogTab';

export const FinanceView: React.FC = () => {
  const { 
    scope, 
    userRole, 
    transactions, 
    expenses, 
    patients, 
    openPaymentCollection, 
    setIsQuickCheckoutOpen
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'transactions' | 'debts' | 'expenses'>('transactions');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');

  // Scope & Account Filtered Transactions
  const filteredTransactions = transactions.filter(t => {
    const scopeMatch = scope === 'unified' || t.practice === scope;
    const accountMatch = selectedAccountFilter === 'all' || t.posAccount.includes(selectedAccountFilter);
    return scopeMatch && accountMatch;
  });

  const filteredExpenses = expenses.filter(e => scope === 'unified' || e.practice === scope || e.practice === 'unified');
  const debtorsList = patients.filter(p => (scope === 'unified' || p.primaryPractice === scope) && p.balance < 0);

  // Totals
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.paidAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalReceivables = debtorsList.reduce((sum, p) => sum + Math.abs(p.balance), 0);

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
            onClick={() => setIsQuickCheckoutOpen(true as any)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <History className="w-4 h-4" />
            <span>ثبت دستی مبالغ گذشته</span>
          </button>
        </div>
      </div>

      {/* 3 Top Summary Cards (If Admin/Doctor visible full net profit, if Secretary visible revenue) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Revenue Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-500">مجموع دریافتی‌های قطعی (کل کلینیک)</span>
          <div className="text-2xl font-black text-emerald-600 flex items-center justify-between">
            <span>{formatCurrency(totalRevenue)}</span>
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-500">مجموع هزینه‌های ثبت‌شده</span>
          <div className="text-2xl font-black text-rose-600 flex items-center justify-between">
            <span>{formatCurrency(totalExpenses)}</span>
            <TrendingDown className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        {/* Net Profit / Receivables Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-500">
            {userRole === 'admin_doctor' ? 'سود خالص عملیاتی کلینیک' : 'کل مطالبات و بدهی‌های معوقه'}
          </span>
          <div className="text-2xl font-black text-indigo-600 flex items-center justify-between">
            <span>
              {userRole === 'admin_doctor' ? formatCurrency(netProfit) : formatCurrency(totalReceivables)}
            </span>
            <CreditCard className="w-6 h-6 text-indigo-500" />
          </div>
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
                    <td className="py-3.5 px-4 font-bold text-slate-800">{trx.date}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{trx.patientName}</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">{toFarsiDigits(trx.fileNumber)}</td>
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
                  <th className="py-3 px-4">موبایل</th>
                  <th className="py-3 px-4">مطب مربوطه</th>
                  <th className="py-3 px-4 text-rose-600">مانده کل بدهی</th>
                  <th className="py-3 px-4 text-center">ثبت وصولی قسط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {debtorsList.map((pat) => (
                  <tr key={pat.id} className="hover:bg-rose-50/40">
                    <td className="py-3.5 px-4 font-bold text-indigo-600">{toFarsiDigits(pat.fileNumber)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{pat.name}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{toFarsiDigits(pat.mobile)}</td>
                    <td className="py-3.5 px-4 font-semibold">
                      {pat.primaryPractice === 'aesthetic' ? 'زیبایی' : 'دندانپزشکی'}
                    </td>
                    <td className="py-3.5 px-4 font-black text-rose-600 text-sm">
                      {formatCurrency(Math.abs(pat.balance))}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openPaymentCollection(pat)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs"
                      >
                        + ثبت دریافت وجه / وصولی قسط
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Expenses Log */}
      {activeTab === 'expenses' && <ExpensesLogTab />}

    </div>
  );
};
