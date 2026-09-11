import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Search, Calendar, UserCheck, ChevronDown, Clock, ShieldCheck } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { getTodayJalaliString, toFarsiDigits } from '../../utils/persianUtils';
import { PracticeScopeDropdown } from '../common/PracticeScopeDropdown';
export const TopBar = () => {
    const { userRole, setUserRole, setIsGlobalSearchOpen } = useClinic();
    const [currentTime, setCurrentTime] = useState('');
    const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
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
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsGlobalSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsGlobalSearchOpen]);
    return (_jsxs("header", { className: "sticky top-0 z-30 h-16 glass-header border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shadow-xs", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20", children: "\u0645\u200C\u06A9" }), _jsxs("div", { className: "hidden sm:block", children: [_jsx("h1", { className: "text-base font-bold text-slate-800 leading-tight", children: "\u06A9\u0644\u06CC\u0646\u06CC\u06A9 \u062A\u062E\u0635\u0635\u06CC \u0645\u062A\u0645\u0631\u06A9\u0632" }), _jsx("p", { className: "text-xs text-slate-500 font-medium", children: "\u0632\u06CC\u0628\u0627\u06CC\u06CC & \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC" })] })] }), _jsx(PracticeScopeDropdown, { labelPrefix: "\u0627\u0646\u062A\u062E\u0627\u0628 \u062D\u0648\u0632\u0647:" })] }), _jsxs("div", { className: "hidden xl:flex items-center gap-3 bg-slate-100/70 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-slate-600", children: [_jsx(Calendar, { className: "w-4 h-4 text-indigo-500" }), _jsx("span", { children: getTodayJalaliString() })] }), _jsx("div", { className: "w-px h-3.5 bg-slate-300" }), _jsxs("div", { className: "flex items-center gap-1.5 font-bold text-slate-800 dir-ltr", children: [_jsx(Clock, { className: "w-3.5 h-3.5 text-slate-500" }), _jsx("span", { children: currentTime || '۱۲:۴۰:۰۰' })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsxs("button", { onClick: () => setIsGlobalSearchOpen(true), className: "flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-600 rounded-xl text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer", children: [_jsx(Search, { className: "w-4 h-4 text-slate-500" }), _jsx("span", { className: "hidden md:inline", children: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0628\u06CC\u0645\u0627\u0631\u060C \u067E\u0631\u0648\u0646\u062F\u0647..." }), _jsx("kbd", { className: "hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-white text-slate-500 rounded border border-slate-200 shadow-2xs", children: "Cmd+K" })] }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setIsRoleMenuOpen(!isRoleMenuOpen), className: "flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold", children: userRole === 'receptionist' ? 'م' : 'پ' }), _jsxs("div", { className: "hidden sm:block text-right", children: [_jsx("p", { className: "font-bold text-slate-800 leading-tight", children: userRole === 'receptionist' ? 'سارا تهرانی' : 'دکتر مجتبی آخرتی' }), _jsx("p", { className: "text-[10px] text-emerald-600 font-medium", children: userRole === 'receptionist' ? 'منشی پذیرش' : 'پزشک مدیر' })] }), _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400" })] }), isRoleMenuOpen && (_jsxs("div", { className: "absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs font-medium", children: [_jsx("div", { className: "px-3 py-1.5 text-[10px] text-slate-400 font-semibold border-b border-slate-100", children: "\u062A\u063A\u06CC\u06CC\u0631 \u0646\u0642\u0634 \u06A9\u0627\u0631\u0628\u0631\u06CC (\u062F\u0645\u0648)" }), _jsxs("button", { onClick: () => {
                                            setUserRole('receptionist');
                                            setIsRoleMenuOpen(false);
                                        }, className: `w-full px-3 py-2 text-right hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${userRole === 'receptionist' ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'}`, children: [_jsx(UserCheck, { className: "w-4 h-4 text-indigo-500" }), _jsx("span", { children: "\u0645\u0646\u0634\u06CC \u067E\u0630\u06CC\u0631\u0634 (\u0639\u0645\u0644\u06CC\u0627\u062A\u06CC)" })] }), _jsxs("button", { onClick: () => {
                                            setUserRole('admin_doctor');
                                            setIsRoleMenuOpen(false);
                                        }, className: `w-full px-3 py-2 text-right hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${userRole === 'admin_doctor' ? 'text-teal-600 font-bold bg-teal-50/50' : 'text-slate-700'}`, children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-teal-500" }), _jsx("span", { children: "\u067E\u0632\u0634\u06A9 \u0645\u062F\u06CC\u0631 (\u062F\u0633\u062A\u0631\u0633\u06CC \u06A9\u0627\u0645\u0644 \u0645\u0627\u0644\u06CC)" })] })] }))] })] })] }));
};
