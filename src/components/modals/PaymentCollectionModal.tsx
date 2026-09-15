import React, { useState, useEffect } from 'react';
import { useClinic, PRACTICE_PAYMENT_ACCOUNTS, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { formatCurrency, getTodayJalaliDate, getJalaliDateOffset, formatJalaliDateDisplay, toEnglishDigits } from '../../utils/persianUtils';
import { X, CheckCircle2, Sparkles, Stethoscope, CreditCard, Calendar } from 'lucide-react';
import { MoneyInput } from '../common/MoneyInput';
import { JalaliDatePicker } from '../common/JalaliDatePicker';

export const PaymentCollectionModal: React.FC = () => {
  const { 
    isPaymentCollectionOpen, 
    setIsPaymentCollectionOpen, 
    selectedPatientForPayment, 
    selectedTransactionForPayment,
    selectedPracticeForPayment,
    transactions,
    getPracticePaymentAccounts,
    collectPayment 
  } = useClinic();

  const pat = selectedPatientForPayment;
  const initialTrx = selectedTransactionForPayment;

  const practice = selectedPracticeForPayment || initialTrx?.practice || pat?.primaryPractice || 'aesthetic';
  const availableAccounts = getPracticePaymentAccounts(practice);

  // Filter service records strictly for this patient in the active practice
  const patientServiceTransactions = pat
    ? transactions.filter(t => t.patientId === pat.id && t.practice === practice && t.trxType !== 'payment')
    : [];

  const [selectedTrxId, setSelectedTrxId] = useState<string>('debt_payment');

  const activeTrx = patientServiceTransactions.find(t => t.id === selectedTrxId);

  // Calculate live debt details for active service or overall patient balance
  const activePatientBalanceDebt = pat ? Math.abs(pat.balance) : 0;
  const currentDebt = activeTrx
    ? (activeTrx.remainingDebt > 0 ? activeTrx.remainingDebt : (activePatientBalanceDebt > 0 ? activePatientBalanceDebt : activeTrx.netCost))
    : (activePatientBalanceDebt > 0 ? activePatientBalanceDebt : 0);
  const previousPaid = activeTrx ? activeTrx.paidAmount : 0;

  const [amount, setAmount] = useState<number>(currentDebt);
  const [posAccount, setPosAccount] = useState<string>('');
  const [debtDueDate, setDebtDueDate] = useState<string>(getJalaliDateOffset(getTodayJalaliDate(), 30));
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (availableAccounts.length > 0) {
      setPosAccount(availableAccounts[0]);
    }
  }, [practice]);

  const [isCustomRecordDate, setIsCustomRecordDate] = useState<boolean>(false);
  const [customRecordDate, setCustomRecordDate] = useState<string>(getTodayJalaliDate());

  useEffect(() => {
    if (isPaymentCollectionOpen && pat) {
      const defaultTrxId = initialTrx?.id || 'debt_payment';
      setSelectedTrxId(defaultTrxId);

      const targetTrx = patientServiceTransactions.find(t => t.id === defaultTrxId);
      const activeBalance = Math.abs(pat.balance);
      const debtVal = targetTrx
        ? (targetTrx.remainingDebt > 0 ? targetTrx.remainingDebt : (activeBalance > 0 ? activeBalance : targetTrx.netCost))
        : (activeBalance > 0 ? activeBalance : 0);

      setAmount(debtVal);
      const accounts = PRACTICE_PAYMENT_ACCOUNTS[practice] || PRACTICE_PAYMENT_ACCOUNTS.aesthetic;
      setPosAccount(accounts[0] || 'کارتخوان');
      setDebtDueDate(targetTrx?.debtDueDate || getJalaliDateOffset(getTodayJalaliDate(), 10));
      setNotes(targetTrx ? `وصول قسط بابت ${targetTrx.serviceName}` : 'وصول قسط / بدهی بیمار');
      setIsCustomRecordDate(false);
      setCustomRecordDate(getTodayJalaliDate());
    }
  }, [isPaymentCollectionOpen, pat, initialTrx, practice]);

  const handleTrxSelectChange = (newTrxId: string) => {
    setSelectedTrxId(newTrxId);
    const targetTrx = patientServiceTransactions.find(t => t.id === newTrxId);
    const activeBalance = pat ? Math.abs(pat.balance) : 0;
    const debtVal = targetTrx
      ? (targetTrx.remainingDebt > 0 ? targetTrx.remainingDebt : (activeBalance > 0 ? activeBalance : targetTrx.netCost))
      : (activeBalance > 0 ? activeBalance : 0);

    setAmount(debtVal);
    setDebtDueDate(targetTrx?.debtDueDate || getJalaliDateOffset(getTodayJalaliDate(), 10));
    setNotes(targetTrx ? `وصول قسط بابت ${targetTrx.serviceName}` : 'وصول قسط / بدهی بیمار');
  };

  if (!isPaymentCollectionOpen || !pat) return null;

  // Real-time calculations
  const clampedPayment = Math.max(0, isNaN(amount) ? 0 : amount);
  const remainingAfterPayment = Math.max(0, currentDebt - clampedPayment);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (remainingAfterPayment > 0 && (!debtDueDate || !debtDueDate.trim())) {
      alert('⚠️ با توجه به باقی ماندن بدهی بیمار، ثبت تاریخ سررسید / پیگیری بعدی الزامی است.');
      return;
    }

    const todayStr = getTodayJalaliDate();
    const normToday = toEnglishDigits(todayStr).trim().replace(/\//g, '-');
    const selectedRecordDate = isCustomRecordDate ? customRecordDate : todayStr;
    const normRecordDate = toEnglishDigits(selectedRecordDate).trim().replace(/\//g, '-');

    if (normRecordDate > normToday) {
      alert('⚠️ تاریخ ثبت دریافت نمی‌تواند در آینده قرار داشته باشد.');
      return;
    }

    try {
      const success = collectPayment(
        pat.id,
        clampedPayment,
        posAccount,
        practice,
        activeTrx?.id,
        remainingAfterPayment > 0 ? debtDueDate : undefined,
        notes,
        isCustomRecordDate ? customRecordDate : undefined
      );
      if (success) {
        setIsPaymentCollectionOpen(false);
      }
    } catch (err) {
      console.error('=== PAYMENT SUBMISSION ERROR AUDIT LOG ===');
      console.error('Raw Error Object:', err);
      console.error('Is Error Instance:', err instanceof Error);
      console.error('Error Message:', err instanceof Error ? err.message : String(err));
      console.error('Stack Trace:', err instanceof Error ? err.stack : 'No stack trace available');
      alert(`خطای سیستم در ثبت پرداختی: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">
        
        {/* Header with Patient & Practice Badge (Fixed) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">ثبت دریافت وجه / وصول بدهی</h3>
              {practice === 'aesthetic' ? (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>مطب زیبایی (خانم دکتر رمضانی)</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-teal-100 text-teal-900 border border-teal-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-teal-600" />
                  <span>مطب دندانپزشکی (آقای دکتر آخرتی)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {pat.name} (شماره پرونده: <span className="font-bold text-indigo-700">{getPatientFileNumberDisplay(pat, practice)}</span>)
            </p>
          </div>
          <button 
            onClick={() => setIsPaymentCollectionOpen(false)} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
          
          {/* Scrollable Form Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* Target Service / Payment Reason Select Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                موضوع دریافت / انتخاب خدمت:
              </label>
              <select
                value={selectedTrxId}
                onChange={(e) => handleTrxSelectChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {patientServiceTransactions.map((t) => (
                  <option key={t.id} value={t.id}>
                    خدمت: {t.serviceName} {t.serviceDate || t.date ? `(${formatJalaliDateDisplay(t.serviceDate || t.date)})` : ''}
                  </option>
                ))}
                <option value="debt_payment">
                  «پرداخت بدهی»
                </option>
              </select>
            </div>

            {/* Real-Time Financial Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>مانده بدهی فعلی:</span>
                <span className="font-bold text-rose-700 text-xs">{formatCurrency(currentDebt)}</span>
              </div>

              {previousPaid > 0 && (
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>پرداخت‌های قبلی:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(previousPaid)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600 font-medium pt-1.5 border-t border-slate-200/80">
                <span>مبلغ پرداختی جدید:</span>
                <span className="font-extrabold text-emerald-700 text-xs">{formatCurrency(clampedPayment)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                <span>مانده پس از پرداخت:</span>
                <span className={remainingAfterPayment === 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                  {formatCurrency(remainingAfterPayment)}
                </span>
              </div>
            </div>

            {/* Payment Amount Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">مبلغ دریافتی (تومان):</label>
              <MoneyInput
                value={amount}
                onChange={(val) => setAmount(val)}
                unit="تومان"
                className="text-xs font-bold text-emerald-700 bg-slate-50 border-slate-300 focus:border-emerald-500"
              />
              {amount > currentDebt && (
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  ⚠️ مبلغ پرداختی نمی‌تواند بیشتر از مانده بدهی فعلی ({formatCurrency(currentDebt)}) باشد.
                </p>
              )}
            </div>

            {/* Record Date (recordDate) Selection Control */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تاریخ ثبت دریافت:</span>
                </span>
                <span className="text-indigo-700 font-extrabold dir-ltr">
                  {isCustomRecordDate ? formatJalaliDateDisplay(customRecordDate) : `امروز (${formatJalaliDateDisplay(getTodayJalaliDate())})`}
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-700 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={isCustomRecordDate}
                  onChange={(e) => {
                    setIsCustomRecordDate(e.target.checked);
                    if (!e.target.checked) {
                      setCustomRecordDate(getTodayJalaliDate());
                    }
                  }}
                  className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <span>ثبت دریافت با تاریخ متفاوت</span>
              </label>

              {isCustomRecordDate && (
                <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600">انتخاب تاریخ ثبت دریافت:</label>
                  <JalaliDatePicker
                    value={customRecordDate}
                    maxDate={getTodayJalaliDate()}
                    onChange={(d) => setCustomRecordDate(d)}
                  />
                </div>
              )}
            </div>

            {/* Practice-Filtered Account Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                روش دریافت و حساب مقصد ({practice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'}):
              </label>
              <select
                value={posAccount}
                onChange={(e) => setPosAccount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {availableAccounts.map((accountName) => (
                  <option key={accountName} value={accountName}>
                    {accountName}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditional Next Due Date or Settlement Notice */}
            {remainingAfterPayment > 0 ? (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-amber-900 font-bold text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>تاریخ سررسید / پیگیری پرداخت بعدی:</span>
                  </div>
                </div>
                <JalaliDatePicker
                  value={debtDueDate}
                  onChange={(date) => setDebtDueDate(date)}
                />
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>با این پرداخت، بدهی بیمار به صورت کامل تسویه خواهد شد.</span>
              </div>
            )}

            {/* Notes Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">توضیحات رسید (اختیاری):</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلاً: قسط دوم خدمات"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons (Fixed Footer) */}
          <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => setIsPaymentCollectionOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>ثبت دریافت وجه</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
