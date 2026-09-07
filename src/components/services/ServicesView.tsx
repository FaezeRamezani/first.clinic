import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { Plus, Sparkles, Stethoscope, CheckCircle2, XCircle } from 'lucide-react';

export const ServicesView: React.FC = () => {
  const { scope, services, toggleServiceActive, addService } = useClinic();

  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [practice, setPractice] = useState<'aesthetic' | 'dental'>('aesthetic');
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('30');
  const [description] = useState<string>('');

  const filteredServices = services.filter(s => scope === 'unified' || s.practice === scope);

  const handleCreateService = () => {
    if (!name || !price) return;
    addService({
      name,
      code: code || `SRV-${Math.floor(100 + Math.random() * 900)}`,
      practice,
      price: parseInt(price, 10),
      duration: parseInt(duration, 10),
      description,
      active: true
    });
    setIsNewServiceModalOpen(false);
    setName('');
    setPrice('');
    setCode('');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">تعرفه خدمات کلینیک و مطب‌ها</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            مدیریت قیمتهای مصوب، بازه زمان استاندارد و خدمات دندانپزشکی و زیبایی
          </p>
        </div>

        <button
          onClick={() => setIsNewServiceModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ تعریف خدمت جدید</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">کد خدمت</th>
                <th className="py-3 px-4">عنوان خدمت</th>
                <th className="py-3 px-4">مطب مربوطه</th>
                <th className="py-3 px-4">تعرفه قیمت مصوب (تومان)</th>
                <th className="py-3 px-4">مدت زمان استاندارد</th>
                <th className="py-3 px-4">توضیحات تکمیلی</th>
                <th className="py-3 px-4 text-center">وضعیت فعال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredServices.map((srv) => (
                <tr key={srv.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{srv.code}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{srv.name}</td>
                  <td className="py-3.5 px-4">
                    {srv.practice === 'aesthetic' ? (
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px] flex items-center gap-1 w-max">
                        <Sparkles className="w-3 h-3 text-indigo-500" /> مطب زیبایی
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded font-semibold text-[10px] flex items-center gap-1 w-max">
                        <Stethoscope className="w-3 h-3 text-teal-500" /> مطب دندانپزشکی
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900 text-sm">{formatCurrency(srv.price)}</td>
                  <td className="py-3.5 px-4 text-slate-600">{toFarsiDigits(srv.duration)} دقیقه</td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">{srv.description || '-'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleServiceActive(srv.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto ${
                        srv.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {srv.active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> فعال
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> غیرفعال
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Service Modal */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">تعریف خدمت و تعرفه جدید</h3>
              <button onClick={() => setIsNewServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان خدمت:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: کامپوزیت لیرینگ دندان"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مطب مربوطه:</label>
                <select
                  value={practice}
                  onChange={(e) => setPractice(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="aesthetic">مطب زیبایی (دکتر رمضانی)</option>
                  <option value="dental">مطب دندانپزشکی (دکتر آخرتی)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تعرفه قیمت مصوب (تومان):</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="مثال: ۳۵۰۰۰۰۰"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مدت زمان رزرو استاندارد (دقیقه):</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="15">۱۵ دقیقه</option>
                  <option value="30">۳۰ دقیقه</option>
                  <option value="45">۴۵ دقیقه</option>
                  <option value="60">۶۰ دقیقه</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleCreateService}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                ثبت خدمت
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
