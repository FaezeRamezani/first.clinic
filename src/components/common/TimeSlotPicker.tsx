import React from 'react';
import { MORNING_SLOTS, EVENING_SLOTS } from '../../utils/timeUtils';
import { toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
import { Sun, Moon } from 'lucide-react';
import type { Appointment } from '../../types';

interface TimeSlotPickerProps {
  value: string; // e.g. "10:30" or "۱۰:۳۰"
  onChange: (slot: string) => void;
  date: string; // Jalali date string e.g. "۱۴۰۵-۰۶-۱۶"
  doctorId: string;
  appointments: Appointment[];
  excludeAppointmentId?: string;
  label?: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  value,
  onChange,
  date,
  doctorId,
  appointments,
  excludeAppointmentId,
  label = 'ساعت نوبت (بازه مجاز):'
}) => {
  const normDate = toEnglishDigits(date).trim().replace(/\//g, '-');
  const normValue = toEnglishDigits(value).trim();

  // Find occupied slots for specified doctor and date (excluding canceled appointments or current appt being rescheduled)
  const isSlotOccupied = (slotStr: string) => {
    const normSlot = toEnglishDigits(slotStr).trim();
    return appointments.some(apt => {
      if (apt.id === excludeAppointmentId || apt.status === 'canceled' || apt.status === 'rescheduled') return false;
      const aptDate = toEnglishDigits(apt.date).trim().replace(/\//g, '-');
      const aptSlot = toEnglishDigits(apt.timeSlot).trim();
      return apt.doctorId === doctorId && aptDate === normDate && aptSlot === normSlot;
    });
  };

  const renderSlotButtons = (slots: string[]) => {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map(slot => {
          const normSlot = toEnglishDigits(slot).trim();
          const farsiSlot = toFarsiDigits(slot);
          const occupied = isSlotOccupied(slot);
          const isSelected = normValue === normSlot;

          return (
            <button
              key={slot}
              type="button"
              disabled={occupied}
              onClick={() => onChange(farsiSlot)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all dir-ltr text-center cursor-pointer select-none ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs scale-105 font-black ring-2 ring-indigo-300'
                  : occupied
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through opacity-70'
                    : 'bg-slate-50 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-800'
              }`}
            >
              {farsiSlot}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">{label}</label>
          {value && (
            <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 dir-ltr">
              انتخاب شده: {toFarsiDigits(value)}
            </span>
          )}
        </div>
      )}

      {/* Morning Shift */}
      <div className="space-y-1 bg-amber-50/40 border border-amber-100 p-2 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 mb-1">
          <Sun className="w-3.5 h-3.5 text-amber-600" />
          <span>شیفت صبح (۰۹:۰۰ تا ۱۳:۰۰)</span>
        </div>
        {renderSlotButtons(MORNING_SLOTS)}
      </div>

      {/* Evening Shift */}
      <div className="space-y-1 bg-indigo-50/40 border border-indigo-100 p-2 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 mb-1">
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
          <span>شیفت عصر (۱۷:۰۰ تا ۲۰:۳۰)</span>
        </div>
        {renderSlotButtons(EVENING_SLOTS)}
      </div>
    </div>
  );
};
