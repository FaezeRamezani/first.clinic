import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency } from '../../utils/persianUtils';
import { Plus, Sparkles, Stethoscope, Building2 } from 'lucide-react';

export const ExpensesLogTab: React.FC = () => {
  const { scope, expenses, setIsNewExpenseOpen } = useClinic();

  const filteredExpenses = expenses.filter(e => scope === 'unified' || e.practice === scope || e.practice === 'unified');
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryLabels: Record<string, string> = {
    consumables: 'مواد مصرفی مطب',
    rent: 'اجاره و رهن',
    salaries: 'حقوق و پرسنل',
    equipment: 'تجهیزات و تعمیرات',
    utilities: 'قبوض و نگهداری',
    other: 'متفرقه'
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-800">دفتر هزینه‌های جاری و عملیاتی کلینیک</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            مجموع هزینه‌های ثبت‌شده: <strong className="text-rose-600 font-black">{formatCurrency(totalExpensesAmount)}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsNewExpenseOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ ثبت هزینه جدید</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">تاریخ ثبت</th>
                <th className="py-3 px-4">عنوان هزینه</th>
                <th className="py-3 px-4">دسته‌بندی</th>
                <th className="py-3 px-4">مطب مربوطه</th>
                <th className="py-3 px-4 text-rose-600">مبلغ (تومان)</th>
                <th className="py-3 px-4">ثبت‌کننده</th>
                <th className="py-3 px-4">شماره فاکتور / رسید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{exp.date}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{exp.title}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[11px]">
                      {categoryLabels[exp.category] || exp.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {exp.practice === 'aesthetic' && (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> زیبایی
                      </span>
                    )}
                    {exp.practice === 'dental' && (
                      <span className="text-teal-600 font-semibold flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> دندانپزشکی
                      </span>
                    )}
                    {exp.practice === 'unified' && (
                      <span className="text-blue-600 font-semibold flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> مشاع (کل کلینیک)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-black text-rose-600 text-sm">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{exp.recordedBy}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{exp.receiptNumber || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
