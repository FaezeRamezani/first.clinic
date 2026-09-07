import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { X } from 'lucide-react';

export const PaymentCollectionModal: React.FC = () => {
  const { 
    isPaymentCollectionOpen, 
    setIsPaymentCollectionOpen, 
    selectedPatientForPayment, 
    collectPayment 
  } = useClinic();

  const pat = selectedPatientForPayment;

  const [amount, setAmount] = useState<number>(pat ? Math.abs(pat.balance) : 0);
  const [method, setMethod] = useState<'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'>('pos_aesthetic');
  const [posAccount, setPosAccount] = useState<string>('کارتخوان بانک سامان (مطب زیبایی)');
  const [notes, setNotes] = useState<string>('وصول قسط / بدهی بیمار');

  if (!isPaymentCollectionOpen || !pat) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    collectPayment(pat.id, amount, method, posAccount, notes);
    setIsPaymentCollectionOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">ثبت دریافت وجه / وصولی بدهی بیمار</h3>
            <p className="text-xs text-slate-500 font-medium">{pat.name} ({toFarsiDigits(pat.fileNumber)})</p>
          </div>
          <button onClick={() => setIsPaymentCollectionOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-bold flex items-center justify-between">
            <span>مانده بدهی کنونی بیمار:</span>
            <span className="text-sm font-black">{formatCurrency(Math.abs(pat.balance))}</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">مبلغ دریافتی جدید (تومان):</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">روش دریافت و حساب مقصد:</label>
            <select
              value={method}
              onChange={(e) => {
                const m = e.target.value as any;
                setMethod(m);
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
            <label className="block font-bold text-slate-700 mb-1">توضیحات رسید (اختیاری):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentCollectionOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              ثبت دریافتی و بروزرسانی پرونده
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
