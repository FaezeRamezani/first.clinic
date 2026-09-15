import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits, toEnglishDigits, getJalaliDayOfWeekName } from '../../utils/persianUtils';
import { Clock, AlertCircle } from 'lucide-react';
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

const generateSessionSlots = (startStr: string, endStr: string, intervalMinutes: number = 30): string[] => {
  const slots: string[] = [];
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  let currentMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  while (currentMins <= endMins) {
    const hours = Math.floor(currentMins / 60);
    const mins = currentMins % 60;
    const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    slots.push(formatted);
    currentMins += intervalMinutes;
  }
  return slots;
};

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  value,
  onChange,
  date,
  doctorId,
  appointments,
  excludeAppointmentId,
  label = 'ساعت نوبت (بازه مجاز):'
}) => {
  const { doctors, globalShifts } = useClinic();
  const normDate = toEnglishDigits(date).trim().replace(/\//g, '-');
  const normValue = toEnglishDigits(value).trim();

  const doctor = doctors.find(d => d.id === doctorId);
  const dayName = getJalaliDayOfWeekName(date);
  const daySchedule = doctor?.weeklySchedule?.find(d => d.day === dayName);

  // Find occupied slots for specified doctor and date
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

  const isOffDay = !daySchedule || (!daySchedule.morningActive && !daySchedule.eveningActive);

  const activeShifts: { label: string; startTime: string; endTime: string }[] = [];
  if (daySchedule?.morningActive && globalShifts?.morning) {
    activeShifts.push({
      label: 'شیفت صبح',
      startTime: globalShifts.morning.startTime,
      endTime: globalShifts.morning.endTime
    });
  }
  if (daySchedule?.eveningActive && globalShifts?.evening) {
    activeShifts.push({
      label: 'شیفت عصر / شب',
      startTime: globalShifts.evening.startTime,
      endTime: globalShifts.evening.endTime
    });
  }

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

      {isOffDay ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>پزشک در روز «{dayName}» برنامه کاری فعال ندارد (تعطیل است).</span>
        </div>
      ) : (
        <div className="space-y-2">
          {activeShifts.map((shift, idx) => {
            const slots = generateSessionSlots(shift.startTime, shift.endTime, 30);
            return (
              <div key={idx} className="space-y-1 bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-2xl">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900 mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{shift.label} ({toFarsiDigits(shift.startTime)} تا {toFarsiDigits(shift.endTime)})</span>
                </div>
                {renderSlotButtons(slots)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
