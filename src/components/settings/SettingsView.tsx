import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Settings, Sparkles, Stethoscope, CreditCard, Save, CheckCircle2, Plus, Edit3, Calendar, X, Clock, AlertCircle, Tag } from 'lucide-react';
import type { Doctor, DoctorDaySchedule, PaymentAccount, DayOfWeekPersian, GlobalShiftsConfig, ExpenseCategory } from '../../types';
import { toFarsiDigits } from '../../utils/persianUtils';

const ALL_DAYS: DayOfWeekPersian[] = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00'
];

export const SettingsView: React.FC = () => {
  const {
    doctors,
    paymentAccounts,
    globalShifts,
    updateGlobalShifts,
    expenseCategories,
    updateExpenseCategories,
    updateDoctorSchedule,
    addPaymentAccount,
    updatePaymentAccount
  } = useClinic();

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  // Central Shifts State
  const [editingShifts, setEditingShifts] = useState<GlobalShiftsConfig>({
    morning: { ...globalShifts.morning },
    evening: { ...globalShifts.evening }
  });

  // Doctor Schedule Modal States
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<Doctor | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DoctorDaySchedule[]>([]);

  // Payment Account Modal States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [accountPractice, setAccountPractice] = useState<'aesthetic' | 'dental'>('aesthetic');

  // Expense Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');

  const handleOpenAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName || !categoryName.trim()) return;

    let updated: ExpenseCategory[];
    if (editingCategory) {
      updated = expenseCategories.map(c => c.id === editingCategory.id ? { ...c, name: categoryName.trim() } : c);
    } else {
      const newCat: ExpenseCategory = {
        id: `cat-${Date.now()}`,
        name: categoryName.trim()
      };
      updated = [...expenseCategories, newCat];
    }

    updateExpenseCategories(updated);
    setIsCategoryModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // --- Central Shift Handlers ---
  const handleSaveGlobalShifts = () => {
    const { morning, evening } = editingShifts;

    // Validation 1: Morning end > morning start
    if (morning.endTime <= morning.startTime) {
      setShiftError('⚠️ ساعت پایان شیفت صبح باید بعد از ساعت شروع باشد.');
      return;
    }

    // Validation 2: Evening end > evening start
    if (evening.endTime <= evening.startTime) {
      setShiftError('⚠️ ساعت پایان شیفت عصر باید بعد از ساعت شروع باشد.');
      return;
    }

    // Validation 3: Morning end <= evening start (No overlap)
    if (morning.endTime > evening.startTime) {
      setShiftError('⚠️ شیفت صبح و شیفت عصر نباید هم‌پوشانی داشته باشند (ساعت پایان صبح نباید بعد از شروع عصر باشد).');
      return;
    }

    setShiftError(null);
    updateGlobalShifts(editingShifts);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // --- Doctor Schedule Handlers ---
  const handleOpenScheduleModal = (doc: Doctor) => {
    setSelectedDoctorForSchedule(doc);

    const currentSchedule = doc.weeklySchedule || [];

    const fullSchedule: DoctorDaySchedule[] = ALL_DAYS.map(dayName => {
      const existing = currentSchedule.find(s => s.day === dayName);
      if (existing) {
        return {
          day: dayName,
          morningActive: existing.morningActive ?? true,
          eveningActive: existing.eveningActive ?? true
        };
      }
      const isOff = dayName === 'جمعه' || (doc.practice === 'aesthetic' && dayName === 'پنج‌شنبه');
      return {
        day: dayName,
        morningActive: !isOff,
        eveningActive: !isOff
      };
    });

    setEditingSchedule(fullSchedule);
  };

  const handleToggleShift = (dayName: DayOfWeekPersian, shiftType: 'morningActive' | 'eveningActive') => {
    setEditingSchedule(prev => prev.map(item => {
      if (item.day !== dayName) return item;
      return {
        ...item,
        [shiftType]: !item[shiftType]
      };
    }));
  };

  const handleSaveDoctorSchedule = () => {
    if (!selectedDoctorForSchedule) return;

    updateDoctorSchedule(selectedDoctorForSchedule.id, editingSchedule);
    setSelectedDoctorForSchedule(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // --- Payment Account Handlers ---
  const handleOpenAddAccountModal = () => {
    setEditingAccount(null);
    setAccountName('');
    setAccountPractice('aesthetic');
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccountModal = (acc: PaymentAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.name);
    setAccountPractice(acc.practice);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!accountName || !accountName.trim()) return;

    if (editingAccount) {
      updatePaymentAccount(editingAccount.id, {
        name: accountName.trim(),
        practice: accountPractice
      });
    } else {
      addPaymentAccount({
        name: accountName.trim(),
        practice: accountPractice
      });
    }

    setIsAccountModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Header (Minimal & Card-less) */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h2 className="text-xl font-black text-slate-900">تنظیمات و پیکربندی کلینیک متمرکز</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            تعریف مرکزی ساعات استاندارد شیفت‌ها، برنامه کاری پزشکان و پیکربندی حساب‌های بانکی
          </p>
        </div>

        {savedSuccess && (
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> تغییرات ذخیره شد
          </span>
        )}
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Right Visual Column (RTL 1st): Time Controls & Doctor Schedules */}
        <div className="space-y-6">

          {/* Central Shift Hours Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-indigo-600" />
                  <span>تعریف مرکزی ساعات استاندارد شیفت‌ها</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  تغییر این ساعات به صورت خودکار روی زمان فعالیت تمام پزشکان دارای شیفت فعال اعمال می‌شود.
                </p>
              </div>

              <button
                onClick={handleSaveGlobalShifts}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره ساعات شیفت‌ها</span>
              </button>
            </div>

            {shiftError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{shiftError}</span>
              </div>
            )}

            {/* Shift cards stacked VERTICALLY */}
            <div className="space-y-4">
              {/* Morning Shift Settings */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs border-b border-amber-200/80 pb-2">
                  <span>☀️ شیفت صبح</span>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg dir-ltr">
                    ({toFarsiDigits(editingShifts.morning.startTime)} تا {toFarsiDigits(editingShifts.morning.endTime)})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ساعت شروع:</label>
                    <select
                      value={editingShifts.morning.startTime}
                      onChange={(e) => setEditingShifts(prev => ({ ...prev, morning: { ...prev.morning, startTime: e.target.value } }))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold dir-ltr focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{toFarsiDigits(time)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ساعت پایان:</label>
                    <select
                      value={editingShifts.morning.endTime}
                      onChange={(e) => setEditingShifts(prev => ({ ...prev, morning: { ...prev.morning, endTime: e.target.value } }))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold dir-ltr focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{toFarsiDigits(time)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Evening Shift Settings */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs border-b border-indigo-200/80 pb-2">
                  <span>🌙 شیفت عصر / شب</span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg dir-ltr">
                    ({toFarsiDigits(editingShifts.evening.startTime)} تا {toFarsiDigits(editingShifts.evening.endTime)})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ساعت شروع:</label>
                    <select
                      value={editingShifts.evening.startTime}
                      onChange={(e) => setEditingShifts(prev => ({ ...prev, evening: { ...prev.evening, startTime: e.target.value } }))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold dir-ltr focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{toFarsiDigits(time)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ساعت پایان:</label>
                    <select
                      value={editingShifts.evening.endTime}
                      onChange={(e) => setEditingShifts(prev => ({ ...prev, evening: { ...prev.evening, endTime: e.target.value } }))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold dir-ltr focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{toFarsiDigits(time)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Working Schedules */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-indigo-600" />
                <span>برنامه کاری و شیفت‌های فعال پزشکان</span>
              </h3>
            </div>

            <div className="space-y-4">
              {doctors.map(doc => {
                const activeDays = doc.weeklySchedule ? doc.weeklySchedule.filter(s => s.morningActive || s.eveningActive) : [];
                return (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {doc.practice === 'aesthetic' ? <Sparkles className="w-4 h-4 text-indigo-600" /> : <Stethoscope className="w-4 h-4 text-teal-600" />}
                        <span className="font-extrabold text-slate-900 text-sm">{doc.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${doc.practice === 'aesthetic' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                          {doc.practice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenScheduleModal(doc)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>ویرایش برنامه کاری</span>
                      </button>
                    </div>

                    <p className="text-slate-600 font-medium">{doc.specialty}</p>

                    <div className="pt-2 border-t border-slate-200/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-700">روزهای حضور فعال:</span>
                      {activeDays.length === 0 ? (
                        <p className="text-[11px] text-amber-700 font-semibold">⚠️ بدون برنامه کاری فعال (تعطیل کامل)</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {activeDays.map(d => {
                            const shiftsText = [
                              d.morningActive ? 'صبح' : '',
                              d.eveningActive ? 'عصر' : ''
                            ].filter(Boolean).join(' + ');

                            return (
                              <span key={d.day} className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-bold">
                                {d.day} ({shiftsText})
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Left Visual Column (RTL 2nd): Bank Accounts & POS Terminals */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
                <span>حساب‌ها</span>
              </h3>

              <button
                onClick={handleOpenAddAccountModal}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ افزودن حساب / دستگاه</span>
              </button>
            </div>

            <div className="space-y-2">
              {paymentAccounts.map((acc) => (
                <div key={acc.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{acc.name}</span>
                    {acc.practice === 'aesthetic' ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-bold">مطب زیبایی</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md text-[10px] font-bold">مطب دندانپزشکی</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenEditAccountModal(acc)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-amber-600" />
                    <span>ویرایش</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Categories Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Tag className="w-4.5 h-4.5 text-indigo-600" />
                <span>دسته‌بندی هزینه‌ها</span>
              </h3>

              <button
                onClick={handleOpenAddCategoryModal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ افزودن دسته‌بندی</span>
              </button>
            </div>

            <div className="space-y-2">
              {expenseCategories.map((cat) => (
                <div key={cat.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-100/80 transition-colors">
                  <span className="font-bold text-slate-900">{cat.name}</span>

                  <button
                    onClick={() => handleOpenEditCategoryModal(cat)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-amber-600" />
                    <span>ویرایش</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Doctor Schedule Checkbox Table Modal */}
      {selectedDoctorForSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">جدول شیفت‌های کاری پزشک</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedDoctorForSchedule.practice === 'aesthetic' ? 'bg-purple-100 text-purple-900' : 'bg-teal-100 text-teal-900'
                    }`}>
                    {selectedDoctorForSchedule.name} ({selectedDoctorForSchedule.practice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'})
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  انتخاب شیفت‌های کاری فعال در روزهای هفته (ساعات شیفت‌ها بر اساس تنظیمات مرکزی کلینیک تعیین می‌شوند)
                </p>
              </div>
              <button onClick={() => setSelectedDoctorForSchedule(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checkbox Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="p-3 font-extrabold text-slate-800 rounded-tr-xl">روز هفته</th>
                    <th className="p-3 font-extrabold text-amber-900 text-center bg-amber-50/80 border-r border-slate-200">
                      شیفت صبح ({toFarsiDigits(globalShifts.morning.startTime)} تا {toFarsiDigits(globalShifts.morning.endTime)})
                    </th>
                    <th className="p-3 font-extrabold text-indigo-900 text-center bg-indigo-50/80 border-r border-slate-200 rounded-tl-xl">
                      شیفت عصر ({toFarsiDigits(globalShifts.evening.startTime)} تا {toFarsiDigits(globalShifts.evening.endTime)})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                  {editingSchedule.map((row) => (
                    <tr key={row.day} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.day}</span>
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 bg-amber-50/30">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={row.morningActive}
                            onChange={() => handleToggleShift(row.day, 'morningActive')}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                          />
                          <span className={`font-bold ${row.morningActive ? 'text-amber-900' : 'text-slate-400'}`}>
                            {row.morningActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </label>
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 bg-indigo-50/30">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={row.eveningActive}
                            onChange={() => handleToggleShift(row.day, 'eveningActive')}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className={`font-bold ${row.eveningActive ? 'text-indigo-900' : 'text-slate-400'}`}>
                            {row.eveningActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDoctorForSchedule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveDoctorSchedule}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره برنامه کاری پزشک</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Payment Account Add/Edit Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingAccount ? 'ویرایش حساب / کارتخوان' : 'افزودن حساب / کارتخوان جدید'}
              </h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام حساب یا دستگاه کارتخوان:</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="مثلاً: کارتخوان بانک سامان - مطب زیبایی"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مطب مربوطه:</label>
                <select
                  value={accountPractice}
                  onChange={(e) => setAccountPractice(e.target.value as 'aesthetic' | 'dental')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="aesthetic">مطب زیبایی</option>
                  <option value="dental">مطب دندانپزشکی</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveAccount}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره حساب</span>
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Expense Category Add/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingCategory ? 'ویرایش دسته‌بندی هزینه' : 'افزودن دسته‌بندی هزینه جدید'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام دسته‌بندی هزینه:</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="مثلاً: تبلیغات و بازاریابی"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره دسته‌بندی</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
