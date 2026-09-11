import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { MORNING_SLOTS, EVENING_SLOTS } from '../../utils/timeUtils';
import { toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
import { Sun, Moon } from 'lucide-react';
export const TimeSlotPicker = ({ value, onChange, date, doctorId, appointments, excludeAppointmentId, label = 'ساعت نوبت (بازه مجاز):' }) => {
    const normDate = toEnglishDigits(date).trim().replace(/\//g, '-');
    const normValue = toEnglishDigits(value).trim();
    // Find occupied slots for specified doctor and date (excluding canceled appointments or current appt being rescheduled)
    const isSlotOccupied = (slotStr) => {
        const normSlot = toEnglishDigits(slotStr).trim();
        return appointments.some(apt => {
            if (apt.id === excludeAppointmentId || apt.status === 'canceled' || apt.status === 'rescheduled')
                return false;
            const aptDate = toEnglishDigits(apt.date).trim().replace(/\//g, '-');
            const aptSlot = toEnglishDigits(apt.timeSlot).trim();
            return apt.doctorId === doctorId && aptDate === normDate && aptSlot === normSlot;
        });
    };
    const renderSlotButtons = (slots) => {
        return (_jsx("div", { className: "grid grid-cols-4 gap-1.5", children: slots.map(slot => {
                const normSlot = toEnglishDigits(slot).trim();
                const farsiSlot = toFarsiDigits(slot);
                const occupied = isSlotOccupied(slot);
                const isSelected = normValue === normSlot;
                return (_jsx("button", { type: "button", disabled: occupied, onClick: () => onChange(farsiSlot), className: `py-1.5 px-2 rounded-xl text-xs font-bold transition-all dir-ltr text-center cursor-pointer select-none ${isSelected
                        ? 'bg-indigo-600 text-white shadow-xs scale-105 font-black ring-2 ring-indigo-300'
                        : occupied
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through opacity-70'
                            : 'bg-slate-50 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-800'}`, children: farsiSlot }, slot));
            }) }));
    };
    return (_jsxs("div", { className: "space-y-2", children: [label && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "block text-xs font-bold text-slate-700", children: label }), value && (_jsxs("span", { className: "text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 dir-ltr", children: ["\u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647: ", toFarsiDigits(value)] }))] })), _jsxs("div", { className: "space-y-1 bg-amber-50/40 border border-amber-100 p-2 rounded-2xl", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-[11px] font-bold text-amber-800 mb-1", children: [_jsx(Sun, { className: "w-3.5 h-3.5 text-amber-600" }), _jsx("span", { children: "\u0634\u06CC\u0641\u062A \u0635\u0628\u062D (\u06F0\u06F9:\u06F0\u06F0 \u062A\u0627 \u06F1\u06F3:\u06F0\u06F0)" })] }), renderSlotButtons(MORNING_SLOTS)] }), _jsxs("div", { className: "space-y-1 bg-indigo-50/40 border border-indigo-100 p-2 rounded-2xl", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 mb-1", children: [_jsx(Moon, { className: "w-3.5 h-3.5 text-indigo-600" }), _jsx("span", { children: "\u0634\u06CC\u0641\u062A \u0639\u0635\u0631 (\u06F1\u06F7:\u06F0\u06F0 \u062A\u0627 \u06F2\u06F0:\u06F3\u06F0)" })] }), renderSlotButtons(EVENING_SLOTS)] })] }));
};
