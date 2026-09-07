import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const QuickCheckoutModal: React.FC = () => {
  const { 
    isQuickCheckoutOpen, 
    setIsQuickCheckoutOpen, 
    selectedAppointmentForCheckout, 
    services, 
    recordCheckout 
  } = useClinic();

  const apt = selectedAppointmentForCheckout;

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'>('pos_aesthetic');
  const [posAccount, setPosAccount] = useState<string>('کارتخوان بانک سامان (مطب زیبایی)');
  const [debtDueDate, setDebtDueDate] = useState<string>('۱۴۰۵-۰۶-۲۵');
  const [notes] = useState<string>('');

  useEffect(() => {
    if (apt) {
      const matchedService = services.find(s => s.id === apt.serviceId) || services[0];
      if (matchedService) {
        setSelectedServiceId(matchedService.id);
        setTotalCost(matchedService.price);
        setPaidAmount(matchedService.price);
      }
      setPaymentMethod(apt.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
      setPosAccount(apt.practice === 'aesthetic' ? 'کارتخوان بانک سامان (مطب زیبایی)' : 'کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
    }
  }, [apt, services]);

  if (!isQuickCheckoutOpen || !apt) return null;

  const handleServiceChange = (srvId: string) => {
    setSelectedServiceId(srvId);
    const srv = services.find(s => s.id === srvId);
    if (srv) {
      setTotalCost(srv.price);
      setPaidAmount(srv.price);
      setDiscount(0);
    }
  };

  const netCost = Math.max(0, totalCost - discount);
  const remainingDebt = Math.max(0, netCost - paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const srv = services.find(s => s.id === selectedServiceId);

    recordCheckout({
      patientId: apt.patientId,
      patientName: apt.patientName,
      fileNumber: apt.fileNumber,
      appointmentId: apt.id,
      practice: apt.practice,
      date: '۱۴۰۵-۰۶-۱۶',
      serviceName: srv?.name || 'خدمت تخصصی',
      totalCost,
      discount,
      netCost,
      paidAmount,
      remainingDebt,
      paymentMethod,
      posAccount,
      debtDueDate: remainingDebt > 0 ? debtDueDate : undefined,
      notes
    });

    setIsQuickCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">ثبت خدمت، صورتحساب و تسویه فوری ویزیت</h3>
            <p className="text-xs text-slate-500 font-medium">بیمار: {apt.patientName} ({toFarsiDigits(apt.fileNumber)})</p>
          </div>
          <button onClick={() => setIsQuickCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Service Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">انتخاب خدمت ارائه شده:</label>
            <select
              value={selectedServiceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              {services
                .filter(s => s.practice === apt.practice)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price)})</option>
                ))}
            </select>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[11px]">مبلغ کل (تومان):</label>
              <input
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[11px]">تخفیف (تومان):</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[11px]">مبلغ نهایی قابل پرداخت:</label>
              <div className="py-2 px-2 text-xs font-black text-indigo-700 bg-indigo-50/70 rounded-xl border border-indigo-200">
                {formatCurrency(netCost)}
              </div>
            </div>
          </div>

          {/* Payment Method & Paid Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">روش و حساب مقصد:</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const m = e.target.value as any;
                  setPaymentMethod(m);
                  if (m === 'pos_aesthetic') setPosAccount('کارتخوان بانک سامان (مطب زیبایی)');
                  else if (m === 'pos_dental') setPosAccount('کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
                  else if (m === 'card_transfer') setPosAccount('حساب کارت به کارت (بانک ملی)');
                  else setPosAccount('صندوق نقدی مطب');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="pos_aesthetic">کارتخوان زیبایی (بانک سامان)</option>
                <option value="pos_dental">کارتخوان دندانپزشکی (پاسارگاد)</option>
                <option value="card_transfer">کارت به کارت (بانک ملی)</option>
                <option value="cash">دریافت نقدی</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مبلغ پرداختی دریافتی (تومان):</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 outline-none"
              />
            </div>
          </div>

          {/* Remaining Debt Warning & Due Date */}
          {remainingDebt > 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>باقیمانده بدهی / قسط جدید:</span>
                </span>
                <span className="text-sm font-black">{formatCurrency(remainingDebt)}</span>
              </div>

              <div>
                <label className="block font-bold text-rose-800 mb-1 text-[11px]">تعیین تاریخ سررسید پرداخت قسط:</label>
                <input
                  type="text"
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  placeholder="۱۴۰۵-۰۶-۲۵"
                  className="w-full bg-white border border-rose-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تسویه کامل انجام می‌شود. (بدون بدهی)</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickCheckoutOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              ثبت ویزیت و صدور صورتحساب
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
