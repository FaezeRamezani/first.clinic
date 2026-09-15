import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { Plus, Sparkles, Stethoscope, CheckCircle2, XCircle, Edit3, Clock } from 'lucide-react';
import { MoneyInput } from '../common/MoneyInput';
import type { ServiceItem } from '../../types';

export const ServicesView: React.FC = () => {
  const { scope, services, toggleServiceActive, addService, updateService } = useClinic();

  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [practice, setPractice] = useState<'aesthetic' | 'dental'>('aesthetic');
  const [price, setPrice] = useState<number>(0);
  const [duration, setDuration] = useState<string>('30');
  const [description, setDescription] = useState<string>('');
  const [defaultPaymentTermDays, setDefaultPaymentTermDays] = useState<number | ''>('');

  const filteredServices = services.filter(s => scope === 'unified' || s.practice === scope);

  const handleOpenCreateModal = () => {
    setEditingServiceId(null);
    setName('');
    setCode('');
    setPractice(scope === 'dental' ? 'dental' : 'aesthetic');
    setPrice(0);
    setDuration('30');
    setDescription('');
    setDefaultPaymentTermDays('');
    setIsServiceModalOpen(true);
  };

  const handleOpenEditModal = (srv: ServiceItem) => {
    setEditingServiceId(srv.id);
    setName(srv.name);
    setCode(srv.code);
    setPractice(srv.practice);
    setPrice(srv.price);
    setDuration(String(srv.duration));
    setDescription(srv.description || '');
    setDefaultPaymentTermDays(srv.defaultPaymentTermDays !== undefined && srv.defaultPaymentTermDays !== null ? srv.defaultPaymentTermDays : '');
    setIsServiceModalOpen(true);
  };

  const handleSaveService = () => {
    if (!name || !name.trim() || price < 0) return;

    const parsedDays = typeof defaultPaymentTermDays === 'number'
      ? defaultPaymentTermDays
      : (defaultPaymentTermDays !== '' ? parseInt(String(defaultPaymentTermDays), 10) : undefined);

    const safeDays = (parsedDays !== undefined && !isNaN(parsedDays) && parsedDays >= 0) ? parsedDays : undefined;

    if (editingServiceId) {
      updateService(editingServiceId, {
        name: name.trim(),
        code: code.trim() || `SRV-${Math.floor(100 + Math.random() * 900)}`,
        practice,
        price: typeof price === 'number' ? price : parseInt(String(price), 10),
        duration: parseInt(duration, 10),
        description: description.trim(),
        defaultPaymentTermDays: safeDays
      });
    } else {
      addService({
        name: name.trim(),
        code: code.trim() || `SRV-${Math.floor(100 + Math.random() * 900)}`,
        practice,
        price: typeof price === 'number' ? price : parseInt(String(price), 10),
        duration: parseInt(duration, 10),
        description: description.trim(),
        defaultPaymentTermDays: safeDays,
        active: true
      });
    }

    setIsServiceModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">تعرفه خدمات کلینیک و مطب‌ها</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            مدیریت قیمت‌های مصوب، توضیحات، مهلت پرداخت پیش‌فرض و بازه زمان استاندارد خدمات
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
                <th className="py-3 px-4">مهلت پرداخت پیش‌فرض</th>
                <th className="py-3 px-4">توضیحات تکمیلی</th>
                <th className="py-3 px-4 text-center">وضعیت فعال</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredServices.map((srv) => (
                <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{toFarsiDigits(srv.code)}</td>
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
                  <td className="py-3.5 px-4 text-indigo-900 font-bold">
                    {srv.defaultPaymentTermDays ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-extrabold">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>{toFarsiDigits(srv.defaultPaymentTermDays)} روز</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={srv.description || ''}>
                    {srv.description || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleServiceActive(srv.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto cursor-pointer ${
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
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleOpenEditModal(srv)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-[10px] flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                      title="ویرایش خدمت"
                    >
                      <Edit3 className="w-3 h-3 text-amber-600" />
                      <span>ویرایش</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {editingServiceId ? 'ویرایش خدمت و تعرفه' : 'تعریف خدمت و تعرفه جدید'}
              </h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Service Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان خدمت:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: کامپوزیت لیرینگ دندان"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              {/* Tariff Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تعرفه قیمت مصوب (تومان):</label>
                <MoneyInput
                  value={price}
                  onChange={(val) => setPrice(val)}
                  unit="تومان"
                  className="bg-slate-50 text-xs font-bold text-slate-800"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات تکمیلی:</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی، ویژگی‌ها یا جزئیات خدمت..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Default Payment Term Days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مهلت پرداخت پیش‌فرض (روز):
                </label>
                <input
                  type="number"
                  min="0"
                  value={defaultPaymentTermDays}
                  onChange={(e) => setDefaultPaymentTermDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="مثال: 30"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 در صورت تسویه ناقص، سررسید بدهی بیمار به‌صورت خودکار بر اساس این تعداد روز محاسبه می‌شود.
                </p>
              </div>

              {/* Practice Selection */}
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

              {/* Standard Duration */}
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

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveService}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {editingServiceId ? 'ذخیره تغییرات' : 'ثبت خدمت'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

