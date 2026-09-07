import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Settings, Sparkles, Stethoscope, CreditCard, Save, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { doctors } = useClinic();
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">تنظیمات و پیکربندی کلینیک متمرکز</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            اطلاعات پزشکان، شماره کارتخوان‌ها و الگوهای پیامک یادآوری نوبت
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>ذخیره تغییرات</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>تنظیمات کلینیک با موفقیت ذخیره گردید.</span>
        </div>
      )}

      {/* Grid Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Doctors Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>پزشکان کلینیک و ساعات کاری</span>
          </h3>

          <div className="space-y-4">
            {doctors.map(doc => (
              <div key={doc.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  {doc.practice === 'aesthetic' ? <Sparkles className="w-4 h-4 text-indigo-600" /> : <Stethoscope className="w-4 h-4 text-teal-600" />}
                  <span className="font-bold text-slate-900">{doc.name}</span>
                </div>
                <p className="text-slate-600 font-medium">{doc.specialty}</p>
                <p className="text-slate-500 font-medium">ساعات کاری: {doc.workingHours}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bank & POS Terminal Mapping */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>پیکربندی حساب‌های بانکی و دستگاه‌های کارتخوان</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">کارتخوان مطب ۱ (زیبایی):</label>
              <input
                type="text"
                defaultValue="کارتخوان بانک سامان (مطب زیبایی) - Terminal #884210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">کارتخوان مطب ۲ (دندانپزشکی):</label>
              <input
                type="text"
                defaultValue="کارتخوان بانک پاسارگاد (مطب دندانپزشکی) - Terminal #904511"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره حساب کارت به کارت کلینیک:</label>
              <input
                type="text"
                defaultValue="۶۰۳۷-۹۹۷۵-۱۱۲۲-۳۳۴۴ (بانک ملی به نام کلینیک متمرکز)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
