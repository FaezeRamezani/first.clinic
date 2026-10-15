import React, { useState, useEffect } from 'react';
import { useClinic, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { 
  getTodayJalaliDate, 
  getJalaliDateOffset, 
  getDateRelationToToday,
  formatJalaliDateLong,
  toFarsiDigits, 
  toEnglishDigits,
  getJalaliDayOfWeekName
} from '../../utils/persianUtils';

// Helper to generate slots for a specific shift session (startStr to endStr)
const generateSessionSlots = (startStr: string, endStr: string, intervalMinutes: number): string[] => {
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
import { 
  Sparkles, 
  Stethoscope, 
  CheckCircle2
} from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import type { Appointment } from '../../types';

export const TimeBlockGrid: React.FC = () => {
  const { 
    scope, 
    appointments, 
    doctors, 
    patients,
    globalShifts,
    openNewAppointment, 
    openCancelAppointment
  } = useClinic();
  
  const todayStr = getTodayJalaliDate();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [doctorIntervals, setDoctorIntervals] = useState<Record<string, number>>({});

  const getDoctorInterval = (doctorId: string) => doctorIntervals[doctorId] || 30;

  const handleDoctorIntervalChange = (doctorId: string, interval: number) => {
    setDoctorIntervals(prev => ({ ...prev, [doctorId]: interval }));
  };

  const dateRelation = getDateRelationToToday(selectedDate);

  // Scope status
  const isScopeEnforced = scope !== 'unified';

  // Doctors list based on Global Scope
  const scopeDoctors = doctors.filter(doc => scope === 'unified' || doc.practice === scope);

  // Initialize selectedDoctorId to the first available doctor (never 'all')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    if (scope !== 'unified') {
      const match = doctors.find(d => d.practice === scope);
      return match ? match.id : (doctors[0]?.id || '');
    }
    return doctors[0]?.id || '';
  });

  // Keep selectedDoctorId in sync when scope or scopeDoctors change
  useEffect(() => {
    if (isScopeEnforced) {
      const match = doctors.find(d => d.practice === scope);
      if (match && selectedDoctorId !== match.id) {
        setSelectedDoctorId(match.id);
      }
    } else {
      // If current selection is invalid or 'all', fallback to first available
      if (!scopeDoctors.some(d => d.id === selectedDoctorId)) {
        if (scopeDoctors.length > 0) {
          setSelectedDoctorId(scopeDoctors[0].id);
        }
      }
    }
  }, [scope, isScopeEnforced, scopeDoctors, selectedDoctorId, doctors]);

  // Filtered doctor to display: strictly exactly 1 doctor at any time
  const currentDoctor = scopeDoctors.find(doc => doc.id === selectedDoctorId) || scopeDoctors[0];
  const displayedDoctors = currentDoctor ? [currentDoctor] : [];

  // Filter ALL appointments matching selected date
  const dateAppointments = appointments.filter(a => {
    const normApptDate = toEnglishDigits(a.date).trim().replace(/\//g, '-');
    const normSelDate = toEnglishDigits(selectedDate).trim().replace(/\//g, '-');
    return normApptDate === normSelDate;
  });

  // Filter appointments specifically for the selected clinic
  const selectedClinicAppointments = dateAppointments.filter(a => {
    return currentDoctor && a.practice === currentDoctor.practice && a.status !== 'canceled' && a.status !== 'rescheduled';
  });

  // Get appointments for a specific practice and slot block
  const getAppointmentsForPracticeAndSlot = (practice: 'aesthetic' | 'dental', slot: string, intervalMinutes: number) => {
    const slotHour = parseInt(toEnglishDigits(slot).split(':')[0], 10);
    const slotMin = parseInt(toEnglishDigits(slot).split(':')[1], 10);
    const slotTotalMins = slotHour * 60 + slotMin;
    const slotEndMins = slotTotalMins + intervalMinutes;

    return dateAppointments.filter(a => {
      if (a.practice !== practice) return false;
      // Exclude canceled and rescheduled appointments so slots are freed for re-booking
      if (a.status === 'canceled' || a.status === 'rescheduled') return false;
      const apptTime = toEnglishDigits(a.timeSlot).trim();
      const parts = apptTime.split(':');
      if (parts.length < 2) return false;
      const apptMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return apptMins >= slotTotalMins && apptMins < slotEndMins;
    });
  };

  const handleCancelGuard = (apt: Appointment) => {
    if (apt.status === 'completed') {
      alert('امکان تغییر یا لغو نوبت کامل‌شده وجود ندارد.');
      return;
    }
    openCancelAppointment(apt);
  };

  const dayOfWeekName = getJalaliDayOfWeekName(selectedDate);

  return (
    <div className="space-y-4">
      
      {/* Timetable Header Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Date Picker & Quick Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Quick Date Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedDate(getJalaliDateOffset(todayStr, -1))}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === getJalaliDateOffset(todayStr, -1)
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                دیروز
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(getJalaliDateOffset(todayStr, 1))}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === getJalaliDateOffset(todayStr, 1)
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فردا
              </button>
            </div>

            {/* Shared Reusable JalaliDatePicker */}
            <div className="w-44">
              <JalaliDatePicker
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate || todayStr)}
              />
            </div>

            {/* Date Status Badge */}
            <div className="inline-flex items-center">
              {dateRelation === 'past' && (
                <span className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px]">
                  تاریخ گذشته (تاریخچه نوبت‌ها)
                </span>
              )}
              {dateRelation === 'today' && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  برنامه امروز کلینیک
                </span>
              )}
              {dateRelation === 'future' && (
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-xl text-[11px]">
                  برنامه تاریخ آینده
                </span>
              )}
            </div>

          </div>

          {/* Right Controls: Clinic Selection Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Clinic Selection Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <span className="text-slate-600 font-bold">انتخاب مطب:</span>
              <select
                value={selectedDoctorId}
                disabled={isScopeEnforced}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className={`bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 outline-none ${
                  isScopeEnforced ? 'cursor-not-allowed opacity-80 bg-slate-100' : 'cursor-pointer focus:border-indigo-500'
                }`}
              >
                {scopeDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.practice === 'aesthetic' ? 'مطب ۱ - زیبایی' : 'مطب ۲ - دندانپزشکی'})
                  </option>
                ))}
              </select>
              {isScopeEnforced && (
                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg whitespace-nowrap">
                  مطب تعیین‌شده توسط محدوده سراسری
                </span>
              )}
            </div>

          </div>

        </div>

        {/* Selected Date Subtitle */}
        <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>{formatJalaliDateLong(selectedDate)}</span>
          <span className="text-slate-400">
            تعداد کل نوبت‌های این روز ({currentDoctor ? (currentDoctor.practice === 'aesthetic' ? 'مطب ۱' : 'مطب ۲') : 'مطب'}): <strong className="text-indigo-600 font-bold">{toFarsiDigits(selectedClinicAppointments.length)}</strong> نوبت
          </span>
        </div>

      </div>

      {/* Main Layout: Single Practice Panel Container (strictly 1 clinic displayed) */}
      <div className="grid gap-6 grid-cols-1">
        {displayedDoctors.map((doc) => {
          const isAesthetic = doc.practice === 'aesthetic';
          const docAppointments = selectedClinicAppointments;
          const docAppointmentsCount = docAppointments.length;
          const docInterval = getDoctorInterval(doc.id);
          
          // Generate time slots based on doctor's weeklySchedule for selectedDate
          const daySchedule = doc.weeklySchedule?.find(d => d.day === dayOfWeekName);
          let docTimeSlots: string[] = [];

          if (daySchedule) {
            if (daySchedule.morningActive && globalShifts?.morning) {
              docTimeSlots.push(...generateSessionSlots(globalShifts.morning.startTime, globalShifts.morning.endTime, docInterval));
            }
            if (daySchedule.eveningActive && globalShifts?.evening) {
              docTimeSlots.push(...generateSessionSlots(globalShifts.evening.startTime, globalShifts.evening.endTime, docInterval));
            }
          }

          return (
            <div 
              key={doc.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
            >
              {/* Practice Panel Banner Header */}
              <div className={`p-4 border-b border-slate-200 flex items-center justify-between ${
                isAesthetic 
                  ? 'bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white border-b-indigo-100' 
                  : 'bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-white border-b-teal-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    isAesthetic ? 'bg-indigo-600' : 'bg-teal-600'
                  }`}>
                    {isAesthetic ? <Sparkles className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{doc.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isAesthetic ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {isAesthetic ? 'مطب داخلی و زیبایی' : 'مطب دندانپزشکی'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{doc.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Independent Doctor Time Slot Interval Dropdown */}
                  <div className="flex items-center gap-1.5 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-xl text-xs shrink-0 shadow-2xs">
                    <span className="text-slate-600 font-bold text-[11px]">بازه زمانی:</span>
                    <select
                      value={docInterval}
                      onChange={(e) => handleDoctorIntervalChange(doc.id, Number(e.target.value))}
                      className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2 py-0.5 outline-none cursor-pointer focus:border-indigo-500"
                    >
                      <option value={30}>۳۰ دقیقه</option>
                      <option value={60}>۶۰ دقیقه</option>
                    </select>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 ${
                    isAesthetic ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                  }`}>
                    {toFarsiDigits(docAppointmentsCount)} نوبت
                  </span>
                </div>
              </div>

              {/* Practice Time Slots Grid */}
              <div className="p-4 flex-1 overflow-y-auto max-h-[680px]">
                {docTimeSlots.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-1 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-700 font-bold">پزشک در روز «{dayOfWeekName}» برنامه کاری فعال ندارد (تعطیل).</p>
                    <p className="text-[10px] text-slate-400 font-normal">برای فعال‌سازی یا تغییر شیفت‌ها، از بخش تنظیمات کلینیک استفاده کنید.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {docTimeSlots.map((slot) => {
                    const isFarsiSlot = toFarsiDigits(slot);
                    const docSlotAppts = getAppointmentsForPracticeAndSlot(doc.practice, slot, docInterval);
                    const activeCount = docSlotAppts.length;
                    const remainingCapacity = Math.max(0, 3 - activeCount);
                    const isFull = activeCount >= 3;

                    return (
                      <div 
                        key={slot}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs ${
                          isFull
                            ? 'bg-slate-50/90 border-slate-200'
                            : activeCount > 0
                              ? isAesthetic 
                                ? 'bg-indigo-50/30 border-indigo-200' 
                                : 'bg-teal-50/30 border-teal-200'
                              : 'bg-white border-dashed border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        {/* Header: Time & Capacity Badge */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-black text-slate-800 dir-ltr">{isFarsiSlot}</span>
                          <div>
                            {isFull ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold rounded-lg text-[10px]">
                                تکمیل ({toFarsiDigits(activeCount)}/۳)
                              </span>
                            ) : activeCount > 0 ? (
                              <span className={`px-2 py-0.5 font-bold rounded-lg text-[10px] ${
                                isAesthetic ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                              }`}>
                                {toFarsiDigits(activeCount)} از ۳ نوبت ({toFarsiDigits(remainingCapacity)} خالی)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                خالی (۳ ظرفیت)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* List of active booked appointments */}
                        {activeCount > 0 && (
                          <div className="space-y-2 py-2 flex-1">
                            {docSlotAppts.map((apt, index) => {
                              const isCompleted = apt.status === 'completed';
                              const isRescheduled = apt.status === 'rescheduled';
                              const isCanceled = apt.status === 'canceled';
                              const isInactive = isCompleted || isRescheduled || isCanceled;

                              return (
                                <div 
                                  key={apt.id}
                                  className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-400">#{toFarsiDigits(index + 1)}</span>
                                      <p className="font-extrabold text-xs text-slate-900 truncate" title={apt.patientName}>
                                        {apt.patientName}
                                      </p>
                                      <span className="text-[8px] px-1 py-0.2 rounded font-bold bg-slate-50 border border-slate-200 text-slate-600 shrink-0">
                                        {(() => {
                                          const p = patients.find(pat => pat.id === apt.patientId);
                                          return p ? getPatientFileNumberDisplay(p, apt.practice) : toFarsiDigits(apt.fileNumber);
                                        })()}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5" title={apt.serviceName || 'ویزیت عمومی'}>
                                      {apt.serviceName || 'ویزیت عمومی'}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isCompleted ? (
                                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9px] flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> تکمیل
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[9px]">
                                        رزرو شده
                                      </span>
                                    )}

                                    {!isInactive && (
                                      <button
                                        type="button"
                                        onClick={() => handleCancelGuard(apt)}
                                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer shadow-2xs"
                                      >
                                        لغو / جابجایی
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Footer: Action button or Full message */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          {!isFull ? (
                            <button
                              type="button"
                              onClick={() => openNewAppointment({ 
                                doctorId: doc.id, 
                                date: selectedDate, 
                                timeSlot: isFarsiSlot, 
                                isSlotBooking: true 
                              })}
                              className="w-full py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-300 hover:border-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                            >
                              <span>+ ثبت نوبت</span>
                              <span className="text-[10px] text-emerald-600 font-normal">
                                ({toFarsiDigits(remainingCapacity)} ظرفیت خالی)
                              </span>
                            </button>
                          ) : (
                            <div className="w-full py-1.5 text-center text-[10px] font-bold text-slate-400 bg-slate-100 rounded-xl">
                              ظرفیت ۳ نوبت در این مطب تکمیل است
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

