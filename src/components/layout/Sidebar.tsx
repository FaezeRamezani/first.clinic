import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BellRing, 
  Users, 
  Wallet, 
  Tag, 
  Settings, 
  Sparkles, 
  Stethoscope, 
  Building2,
  ChevronLeft
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, scope, onlineRequests, followUps, appointments } = useClinic();

  // Calculate badge counts
  const pendingRequestsCount = onlineRequests.filter(r => r.status === 'pending').length;
  const pendingFollowUpsCount = followUps.filter(f => f.status === 'pending').length;
  const unsettledAppointmentsCount = appointments.filter(a => a.status === 'unsettled').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'داشبورد و کنترل عملیاتی',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'appointments',
      label: 'مدیریت و تقویم نوبت‌ها',
      icon: CalendarDays,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} درخواست` : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'reminders',
      label: 'یادآورها و پیگیری روزانه',
      icon: BellRing,
      badge: (pendingFollowUpsCount + unsettledAppointmentsCount) > 0 ? `${pendingFollowUpsCount + unsettledAppointmentsCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-800 font-bold'
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

  const scopeColorClasses = {
    unified: 'from-blue-600 to-indigo-600',
    aesthetic: 'from-indigo-600 to-violet-600',
    dental: 'from-teal-600 to-cyan-600'
  };

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0 z-20">
      <div className="p-4 space-y-6">
        
        {/* Practice Info Badge */}
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r ${scopeColorClasses[scope]} text-white shadow-sm flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            {scope === 'aesthetic' && <Sparkles className="w-5 h-5" />}
            {scope === 'dental' && <Stethoscope className="w-5 h-5" />}
            {scope === 'unified' && <Building2 className="w-5 h-5" />}
            <div>
              <p className="text-xs font-semibold opacity-90">حالت فعال فیلتر:</p>
              <p className="text-xs font-bold leading-snug">
                {scope === 'unified' && 'کلینیک مشترک (همه)'}
                {scope === 'aesthetic' && 'مطب زیبایی (دکتر رمضانی)'}
                {scope === 'dental' && 'مطب دندانپزشکی (دکتر آخرتی)'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
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
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium text-center">
        سامانه هوشمند کلینیک متمرکز v2.5
        <p className="text-[10px] text-slate-400/80 mt-0.5">طراحی ویژه مطب زیبایی و دندانپزشکی</p>
      </div>
    </aside>
  );
};
