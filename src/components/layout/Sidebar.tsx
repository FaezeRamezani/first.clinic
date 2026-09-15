import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Tag,
  Settings,
  Sparkles,
  Stethoscope,
  Building2,
  ChevronLeft,
  Calendar,
  Plus
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    scope,
    onlineRequests,
    openNewAppointment
  } = useClinic();

  // Calculate badge counts
  const pendingRequestsCount = onlineRequests.filter(r => r.status === 'pending').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'صفحه اصلی',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'appointments',
      label: 'نوبت‌دهی',
      icon: CalendarDays,
      badge: pendingRequestsCount > 0 ? `${toFarsiDigits(pendingRequestsCount)} درخواست` : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'patients',
      label: 'پرونده بیماران',
      icon: Users,
      badge: null
    },
    {
      id: 'finance',
      label: 'مدیریت مالی و بدهی‌ها',
      icon: Wallet,
      badge: null
    },
    {
      id: 'services',
      label: 'تعرفه خدمات',
      icon: Tag,
      badge: null
    },
    {
      id: 'settings',
      label: 'تنظیمات کلینیک',
      icon: Settings,
      badge: null
    }
  ];

  // Visual tokens for practice scope
  const scopeConfig = {
    unified: {
      bg: 'bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100/50',
      border: 'border-indigo-200',
      text: 'text-indigo-950',
      subText: 'text-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-700',
      Icon: Building2,
      label: 'کل کلینیک',
      subLabel: 'زیبایی & دندانپزشکی'
    },
    aesthetic: {
      bg: 'bg-gradient-to-br from-purple-50 via-slate-50 to-purple-100/50',
      border: 'border-purple-200',
      text: 'text-purple-950',
      subText: 'text-purple-600',
      badgeBg: 'bg-purple-100 text-purple-700',
      Icon: Sparkles,
      label: 'داخلی و زیبایی',
      subLabel: 'مطب ۱ (پوست و زیبایی)'
    },
    dental: {
      bg: 'bg-gradient-to-br from-teal-50 via-slate-50 to-teal-100/50',
      border: 'border-teal-200',
      text: 'text-teal-950',
      subText: 'text-teal-600',
      badgeBg: 'bg-teal-100 text-teal-700',
      Icon: Stethoscope,
      label: 'دندانپزشکی',
      subLabel: 'مطب ۲ (دندانپزشکی)'
    }
  };

  const currentScope = scopeConfig[scope];
  const ScopeIcon = currentScope.Icon;

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0 z-20 overflow-y-auto">
      <div className="p-3.5 space-y-4">

        {/* Practice Scope Indicator */}
        <div className={`p-3 rounded-xl ${currentScope.bg} border ${currentScope.border} shadow-2xs space-y-1.5 transition-all duration-200`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">حوزه فعال سیستم</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentScope.badgeBg}`}>
              {scope === 'unified' ? 'مشترک' : scope === 'aesthetic' ? 'مطب ۱' : 'مطب ۲'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg bg-white shadow-2xs border ${currentScope.border}`}>
              <ScopeIcon className={`w-4 h-4 ${currentScope.subText}`} />
            </div>
            <div>
              <p className={`text-xs font-black ${currentScope.text} leading-tight`}>{currentScope.label}</p>
              <p className="text-[10px] text-slate-500 font-medium">{currentScope.subLabel}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions (Moved into Sidebar) */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>ثبت سریع</span>
            </span>
          </div>
          <div className="grid gap-1.5">
            <button
              onClick={() => openNewAppointment()}
              className="flex items-center justify-center gap-1.5 px-2 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>نوبت جدید</span>
            </button>

            {/*<button
              onClick={() => setIsNewPatientOpen(true)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-600" />
              <span>بیمار جدید</span>
            </button>*/}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1 pt-1">
          <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            منوی اصلی
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium text-center">
        سامانه هوشمند کلینیک متمرکز
        <p className="text-[10px] text-slate-400/80 mt-0.5">زیبایی & دندانپزشکی</p>
      </div>
    </aside>
  );
};
