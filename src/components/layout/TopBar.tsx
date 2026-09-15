import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  UserCheck, 
  ChevronDown, 
  Clock, 
  ShieldCheck
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { getTodayJalaliDate, toFarsiDigits } from '../../utils/persianUtils';
import { PracticeScopeDropdown } from '../common/PracticeScopeDropdown';
import { JalaliDatePicker } from '../common/JalaliDatePicker';

export const TopBar: React.FC = () => {
  const { 
    userRole, 
    setUserRole, 
    setIsGlobalSearchOpen,
    dashboardDate,
    setDashboardDate
  } = useClinic();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = toFarsiDigits(now.getHours().toString().padStart(2, '0'));
      const minutes = toFarsiDigits(now.getMinutes().toString().padStart(2, '0'));
      const seconds = toFarsiDigits(now.getSeconds().toString().padStart(2, '0'));
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hotkey listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsGlobalSearchOpen]);

  const todayStr = getTodayJalaliDate();

  return (
    <header className="sticky top-0 z-30 h-16 glass-header border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shadow-xs">
      
      {/* Right Side: Logo & Global Practice Scope Dropdown */}
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
            م‌ک
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-800 leading-tight">کلینیک تخصصی متمرکز</h1>
            <p className="text-xs text-slate-500 font-medium">زیبایی & دندانپزشکی</p>
          </div>
        </div>

        {/* Global Synchronized Practice Selector Dropdown */}
        <PracticeScopeDropdown labelPrefix="انتخاب حوزه:" />
      </div>

      {/* Middle: Jalali Date Picker for Dashboard & Time Display */}
      <div className="hidden lg:flex items-center gap-3 bg-slate-100/70 border border-slate-200 px-3 py-1 rounded-xl text-xs font-medium text-slate-700">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="w-36">
            <JalaliDatePicker
              value={dashboardDate || todayStr}
              onChange={(newDate) => setDashboardDate(newDate || todayStr)}
            />
          </div>
          {dashboardDate && dashboardDate !== todayStr && (
            <button
              type="button"
              onClick={() => setDashboardDate(todayStr)}
              className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
              title="بازگشت به امروز"
            >
              امروز
            </button>
          )}
        </div>
        <div className="w-px h-3.5 bg-slate-300"></div>
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dir-ltr">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentTime || '۱۲:۴۰:۰۰'}</span>
        </div>
      </div>

      {/* Left Side: Global Search & Role */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          onClick={() => setIsGlobalSearchOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-600 rounded-xl text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 text-slate-500" />
          <span className="hidden md:inline">جستجوی بیمار، پرونده...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-white text-slate-500 rounded border border-slate-200 shadow-2xs">
            Cmd+K
          </kbd>
        </button>

        {/* User Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {userRole === 'receptionist' ? 'م' : 'پ'}
            </div>
            <div className="hidden sm:block text-right">
              <p className="font-bold text-slate-800 leading-tight">
                {userRole === 'receptionist' ? 'سارا تهرانی' : 'دکتر مجتبی آخرتی'}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">
                {userRole === 'receptionist' ? 'منشی پذیرش' : 'پزشک مدیر'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs font-medium">
              <div className="px-3 py-1.5 text-[10px] text-slate-400 font-semibold border-b border-slate-100">
                تغییر نقش کاربری (دمو)
              </div>
              <button
                onClick={() => {
                  setUserRole('receptionist');
                  setIsRoleMenuOpen(false);
                }}
                className={`w-full px-3 py-2 text-right hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${userRole === 'receptionist' ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'}`}
              >
                <UserCheck className="w-4 h-4 text-indigo-500" />
                <span>منشی پذیرش (عملیاتی)</span>
              </button>
              <button
                onClick={() => {
                  setUserRole('admin_doctor');
                  setIsRoleMenuOpen(false);
                }}
                className={`w-full px-3 py-2 text-right hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${userRole === 'admin_doctor' ? 'text-teal-600 font-bold bg-teal-50/50' : 'text-slate-700'}`}
              >
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                <span>پزشک مدیر (دسترسی کامل مالی)</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
