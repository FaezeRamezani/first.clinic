import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X } from 'lucide-react';

export const NewExpenseModal: React.FC = () => {
  const { isNewExpenseOpen, setIsNewExpenseOpen, addExpense } = useClinic();

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<'consumables' | 'rent' | 'salaries' | 'equipment' | 'utilities' | 'other'>('consumables');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('۱۴۰۵-۰۶-۱۶');
  const [practice, setPractice] = useState<'aesthetic' | 'dental' | 'unified'>('aesthetic');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [description] = useState<string>('');

  if (!isNewExpenseOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    addExpense({
      title,
      category,
      amount: parseInt(amount, 10),
      date,
      practice,
      recordedBy: 'منشی پذیرش',
      receiptNumber,
      description
    });

    setIsNewExpenseOpen(false);
    setTitle('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800">ثبت هزینه عملیاتی / جاری جدید</h3>
          <button onClick={() => setIsNewExpenseOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">عنوان هزینه:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلا: خرید مواد بیحسی و سوزن دندانپزشکی"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">دسته‌بندی هزینه:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="consumables">مواد مصرفی</option>
                <option value="rent">اجاره و رهن</option>
                <option value="salaries">حقوق پرسنل</option>
                <option value="equipment">تجهیزات و تعمیرات</option>
                <option value="utilities">قبوض و نگهداری</option>
                <option value="other">متفرقه</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مبلغ (تومان):</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="مثلا: ۵۰۰۰۰۰۰"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">مطب مربوطه:</label>
              <select
                value={practice}
                onChange={(e) => setPractice(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="aesthetic">مطب ۱ (زیبایی)</option>
                <option value="dental">مطب ۲ (دندانپزشکی)</option>
                <option value="unified">مشاع (کل کلینیک)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاریخ (شمسی):</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">شماره فاکتور / شماره رسید خرید:</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="مثلا: REC-9921"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewExpenseOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              ثبت هزینه
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
