import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import moment from 'jalali-moment';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
const jalaliMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const JalaliDatePicker = ({ value, onChange, label, placeholder = 'انتخاب تاریخ شمسی', className = '', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef(null);
    // Measure available vertical space in viewport when opening popover
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 290px below input, open popover above input
            setOpenUpward(spaceBelow < 290);
        }
    }, [isOpen]);
    // Parse initial value to moment object in Jalali locale
    const getInitialMoment = () => {
        if (!value)
            return moment().locale('fa');
        const eng = toEnglishDigits(value).trim().replace(/\//g, '-');
        const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
        return m.isValid() ? m : moment().locale('fa');
    };
    const [viewMoment, setViewMoment] = useState(getInitialMoment());
    // Update view moment if prop value changes and popover is unopened
    useEffect(() => {
        if (value) {
            const eng = toEnglishDigits(value).trim().replace(/\//g, '-');
            const m = moment(eng, 'jYYYY-jMM-jDD').locale('fa');
            if (m.isValid())
                setViewMoment(m);
        }
    }, [value]);
    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const jYear = viewMoment.jYear();
    const jMonth = viewMoment.jMonth(); // 0 to 11
    const handlePrevMonth = () => {
        const next = viewMoment.clone().subtract(1, 'jMonth');
        setViewMoment(next);
    };
    const handleNextMonth = () => {
        const next = viewMoment.clone().add(1, 'jMonth');
        setViewMoment(next);
    };
    const daysInMonth = moment.jDaysInMonth(jYear, jMonth);
    // Find weekday index of day 1 of month (0 = Saturday, ..., 6 = Friday)
    const firstDayStr = `${jYear}-${(jMonth + 1).toString().padStart(2, '0')}-01`;
    const firstDayMoment = moment(firstDayStr, 'jYYYY-jMM-jDD');
    const firstDayOfWeekIndex = (firstDayMoment.day() + 1) % 7;
    // Selected date normalized for highlight check
    const normalizedSelected = value ? toEnglishDigits(value).trim().replace(/\//g, '-') : '';
    const normalizedToday = moment().locale('fa').format('jYYYY-jMM-jDD');
    const handleSelectDay = (dayNum) => {
        const monthStr = (jMonth + 1).toString().padStart(2, '0');
        const dayStr = dayNum.toString().padStart(2, '0');
        const dateFormatted = toFarsiDigits(`${jYear}-${monthStr}-${dayStr}`);
        onChange(dateFormatted);
        setIsOpen(false);
    };
    return (_jsxs("div", { className: `relative inline-block w-full ${className}`, ref: containerRef, children: [label && (_jsx("label", { className: "block text-xs font-bold text-slate-700 mb-1", children: label })), _jsxs("div", { onClick: () => !disabled && setIsOpen(!isOpen), className: `flex items-center justify-between border rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer select-none ${disabled
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : isOpen
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-100 text-slate-800'
                        : 'bg-slate-50 border-slate-300 hover:border-indigo-400 text-slate-800'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CalendarIcon, { className: "w-4 h-4 text-indigo-600 shrink-0" }), _jsx("span", { className: "dir-ltr text-right", children: value ? toFarsiDigits(value) : _jsx("span", { className: "text-slate-400 font-normal", children: placeholder }) })] }), value && !disabled && (_jsx("button", { type: "button", onClick: (e) => {
                            e.stopPropagation();
                            onChange('');
                        }, className: "text-slate-400 hover:text-slate-600 p-0.5", children: _jsx(X, { className: "w-3.5 h-3.5" }) }))] }), isOpen && (_jsxs("div", { className: `absolute z-50 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-64 text-xs animate-in fade-in zoom-in-95 duration-150 select-none ${openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-2 mb-2", children: [_jsx("button", { type: "button", onClick: handlePrevMonth, className: "p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer", title: "\u0645\u0627\u0647 \u0642\u0628\u0644", children: _jsx(ChevronRight, { className: "w-4 h-4" }) }), _jsxs("span", { className: "font-extrabold text-slate-800 text-xs", children: [jalaliMonths[jMonth], " ", toFarsiDigits(jYear)] }), _jsx("button", { type: "button", onClick: handleNextMonth, className: "p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer", title: "\u0645\u0627\u0647 \u0628\u0639\u062F", children: _jsx(ChevronLeft, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] mb-1", children: weekDays.map((wd, i) => (_jsx("span", { children: wd }, i))) }), _jsxs("div", { className: "grid grid-cols-7 gap-1 text-center font-medium", children: [Array.from({ length: firstDayOfWeekIndex }).map((_, i) => (_jsx("span", { className: "p-1.5" }, `empty-${i}`))), Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const monthStr = (jMonth + 1).toString().padStart(2, '0');
                                const dayStr = dayNum.toString().padStart(2, '0');
                                const currentIso = `${jYear}-${monthStr}-${dayStr}`;
                                const isSelected = normalizedSelected === currentIso;
                                const isToday = normalizedToday === currentIso;
                                return (_jsx("button", { type: "button", onClick: () => handleSelectDay(dayNum), className: `p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isSelected
                                        ? 'bg-indigo-600 text-white shadow-2xs font-extrabold scale-105'
                                        : isToday
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold'
                                            : 'hover:bg-slate-100 text-slate-700'}`, children: toFarsiDigits(dayNum) }, dayNum));
                            })] }), _jsxs("div", { className: "pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-[10px]", children: [_jsxs("button", { type: "button", onClick: () => {
                                    const todayM = moment().locale('fa');
                                    setViewMoment(todayM);
                                    onChange(toFarsiDigits(todayM.format('jYYYY-jMM-jDD')));
                                    setIsOpen(false);
                                }, className: "text-indigo-600 font-bold hover:underline cursor-pointer", children: ["\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0645\u0631\u0648\u0632 (", toFarsiDigits(normalizedToday), ")"] }), _jsx("button", { type: "button", onClick: () => setIsOpen(false), className: "text-slate-400 hover:text-slate-600 cursor-pointer", children: "\u0628\u0633\u062A\u0646" })] })] }))] }));
};
