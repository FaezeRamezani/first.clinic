import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { LayoutDashboard, CalendarDays, BellRing, Users, Wallet, Tag, Settings, Sparkles, Stethoscope, Building2, ChevronLeft, Calendar, UserPlus, Plus } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
export const Sidebar = () => {
    const { activeView, setActiveView, scope, onlineRequests, followUps, appointments, setIsNewAppointmentOpen, setIsNewPatientOpen } = useClinic();
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
    return (_jsxs("aside", { className: "w-64 bg-white border-l border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0 z-20 overflow-y-auto", children: [_jsxs("div", { className: "p-3.5 space-y-4", children: [_jsxs("div", { className: `p-3 rounded-xl ${currentScope.bg} border ${currentScope.border} shadow-2xs space-y-1.5 transition-all duration-200`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "\u062D\u0648\u0632\u0647 \u0641\u0639\u0627\u0644 \u0633\u06CC\u0633\u062A\u0645" }), _jsx("span", { className: `px-1.5 py-0.5 rounded text-[10px] font-bold ${currentScope.badgeBg}`, children: scope === 'unified' ? 'مشترک' : scope === 'aesthetic' ? 'مطب ۱' : 'مطب ۲' })] }), _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: `p-1.5 rounded-lg bg-white shadow-2xs border ${currentScope.border}`, children: _jsx(ScopeIcon, { className: `w-4 h-4 ${currentScope.subText}` }) }), _jsxs("div", { children: [_jsx("p", { className: `text-xs font-black ${currentScope.text} leading-tight`, children: currentScope.label }), _jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: currentScope.subLabel })] })] })] }), _jsxs("div", { className: "bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2", children: [_jsx("div", { className: "flex items-center justify-between px-1", children: _jsxs("span", { className: "text-[11px] font-bold text-slate-600 flex items-center gap-1", children: [_jsx(Plus, { className: "w-3.5 h-3.5 text-indigo-600" }), _jsx("span", { children: "\u062B\u0628\u062A \u0633\u0631\u06CC\u0639" })] }) }), _jsx("div", { className: "grid gap-1.5", children: _jsxs("button", { onClick: () => setIsNewAppointmentOpen(true), className: "flex items-center justify-center gap-1.5 px-2 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer", children: [_jsx(Calendar, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0646\u0648\u0628\u062A \u062C\u062F\u06CC\u062F" })] }) })] }), _jsxs("nav", { className: "space-y-1 pt-1", children: [_jsx("div", { className: "px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "\u0645\u0646\u0648\u06CC \u0627\u0635\u0644\u06CC" }), navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;
                                return (_jsxs("button", { onClick: () => setActiveView(item.id), className: `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${isActive
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`, children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Icon, { className: `w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}` }), _jsx("span", { children: item.label })] }), item.badge ? (_jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor || 'bg-slate-200 text-slate-700'}`, children: item.badge })) : (isActive && _jsx(ChevronLeft, { className: "w-3.5 h-3.5 text-slate-400" }))] }, item.id));
                            })] })] }), _jsxs("div", { className: "p-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium text-center", children: ["\u0633\u0627\u0645\u0627\u0646\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u06A9\u0644\u06CC\u0646\u06CC\u06A9 \u0645\u062A\u0645\u0631\u06A9\u0632", _jsx("p", { className: "text-[10px] text-slate-400/80 mt-0.5", children: "\u0632\u06CC\u0628\u0627\u06CC\u06CC & \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC" })] })] }));
};
