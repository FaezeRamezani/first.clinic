import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { Building2, Sparkles, Stethoscope, ChevronDown, Check } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
export const scopeOptions = [
    {
        id: 'unified',
        label: 'کل کلینیک',
        subLabel: 'هر دو مطب (مشترک)',
        icon: Building2,
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-700',
        borderColor: 'border-indigo-200',
        activeBg: 'bg-indigo-50/90 text-indigo-950 font-bold border-r-4 border-r-indigo-600',
        iconColor: 'text-indigo-600',
    },
    {
        id: 'aesthetic',
        label: 'داخلی و زیبایی',
        subLabel: 'مطب ۱ (پوست و زیبایی)',
        icon: Sparkles,
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        borderColor: 'border-purple-200',
        activeBg: 'bg-purple-50/90 text-purple-950 font-bold border-r-4 border-r-purple-600',
        iconColor: 'text-purple-600',
    },
    {
        id: 'dental',
        label: 'دندانپزشکی',
        subLabel: 'مطب ۲ (دندانپزشکی)',
        icon: Stethoscope,
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-700',
        borderColor: 'border-teal-200',
        activeBg: 'bg-teal-50/90 text-teal-950 font-bold border-r-4 border-r-teal-600',
        iconColor: 'text-teal-600',
    },
];
export const PracticeScopeDropdown = ({ className = '', labelPrefix }) => {
    const { scope, setScope } = useClinic();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const selectedOption = scopeOptions.find((o) => o.id === scope) || scopeOptions[0];
    const SelectedIcon = selectedOption.icon;
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (_jsxs("div", { className: `relative inline-block text-right ${className}`, ref: dropdownRef, children: [_jsxs("button", { type: "button", onClick: () => setIsOpen(!isOpen), className: `flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs hover:shadow-xs cursor-pointer ${selectedOption.badgeBg} ${selectedOption.badgeText} ${selectedOption.borderColor}`, "aria-haspopup": "listbox", "aria-expanded": isOpen, children: [_jsx("div", { className: `p-1 rounded-lg bg-white/80 border ${selectedOption.borderColor} shadow-2xs`, children: _jsx(SelectedIcon, { className: `w-4 h-4 ${selectedOption.iconColor}` }) }), _jsxs("div", { className: "text-right", children: [labelPrefix && _jsx("span", { className: "block text-[10px] text-slate-400 font-normal", children: labelPrefix }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "font-bold text-slate-800 text-xs", children: selectedOption.label }), _jsxs("span", { className: "text-[10px] text-slate-500 font-medium hidden sm:inline", children: ["(", selectedOption.subLabel, ")"] })] })] }), _jsx(ChevronDown, { className: `w-4 h-4 text-slate-400 transition-transform duration-200 mr-1 ${isOpen ? 'rotate-180' : ''}` })] }), isOpen && (_jsxs("div", { className: "absolute left-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100", role: "listbox", children: [_jsx("div", { className: "px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "\u062A\u063A\u06CC\u06CC\u0631 \u062D\u0648\u0632\u0647 \u0645\u0637\u0628 / \u06A9\u0644\u06CC\u0646\u06CC\u06A9" }), scopeOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = opt.id === scope;
                        return (_jsxs("button", { type: "button", onClick: () => {
                                setScope(opt.id);
                                setIsOpen(false);
                            }, className: `w-full flex items-center justify-between px-3.5 py-2.5 text-right text-xs transition-colors hover:bg-slate-50 cursor-pointer ${isSelected ? opt.activeBg : 'text-slate-700'}`, role: "option", "aria-selected": isSelected, children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: `p-1.5 rounded-lg ${opt.badgeBg} ${opt.badgeText} border ${opt.borderColor}`, children: _jsx(Icon, { className: `w-4 h-4 ${opt.iconColor}` }) }), _jsxs("div", { children: [_jsx("span", { className: "block font-bold text-slate-800", children: opt.label }), _jsx("span", { className: "block text-[10px] text-slate-400 font-medium", children: opt.subLabel })] })] }), isSelected && _jsx(Check, { className: `w-4 h-4 ${opt.iconColor}` })] }, opt.id));
                    })] }))] }));
};
