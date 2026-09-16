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
  CheckCircle2,
  XCircle,
  ArrowRightLeft
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
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  const getDoctorInterval = (doctorId: string) => doctorIntervals[doctorId] || 30;

  const handleDoctorIntervalChange = (doctorId: string, interval: number) => {
    setDoctorIntervals(prev => ({ ...prev, [doctorId]: interval }));
  };

  const dateRelation = getDateRelationToToday(selectedDate);

  // Doctors list based on Global Scope
  const scopeDoctors = doctors.filter(doc => scope === 'unified' || doc.practice === scope);

  // Reset selected doctor if no longer available in current practice scope
  useEffect(() => {
    if (selectedDoctorId !== 'all' && !scopeDoctors.some(d => d.id === selectedDoctorId)) {
      setSelectedDoctorId('all');
    }
  }, [scope, scopeDoctors, selectedDoctorId]);

  // Filtered doctors to display
  const displayedDoctors = scopeDoctors.filter(doc => selectedDoctorId === 'all' || doc.id === selectedDoctorId);

  // Filter ALL appointments matching selected date
  const dateAppointments = appointments.filter(a => {
    const normApptDate = toEnglishDigits(a.date).trim().replace(/\//g, '-');
    const normSelDate = toEnglishDigits(selectedDate).trim().replace(/\//g, '-');
    return normApptDate === normSelDate;
  });

  // Get appointments for a specific doctor and slot block
  const getAppointmentsForDoctorAndSlot = (doctorId: string, slot: string, intervalMinutes: number) => {
    const slotHour = parseInt(toEnglishDigits(slot).split(':')[0], 10);
    const slotMin = parseInt(toEnglishDigits(slot).split(':')[1], 10);
    const slotTotalMins = slotHour * 60 + slotMin;
    const slotEndMins = slotTotalMins + intervalMinutes;

    return dateAppointments.filter(a => {
      if (a.doctorId !== doctorId) return false;
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

          {/* Right Controls: Doctor Selection Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Doctor Selection Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <span className="text-slate-600 font-bold">انتخاب پزشک / مطب:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-500"
              >
                <option value="all">همه مطب‌ها (همزمان)</option>
                {scopeDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.practice === 'aesthetic' ? 'مطب ۱' : 'مطب ۲'})
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>

        {/* Selected Date Subtitle */}
        <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>{formatJalaliDateLong(selectedDate)}</span>
          <span className="text-slate-400">
            تعداد کل نوبت‌های این روز: <strong className="text-indigo-600 font-bold">{toFarsiDigits(dateAppointments.filter(a => a.status !== 'canceled' && a.status !== 'rescheduled').length)}</strong> نوبت
          </span>
        </div>

      </div>

      {/* Main Layout: Side-by-Side Practice Panels Container */}
      <div className={`grid gap-6 ${displayedDoctors.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {displayedDoctors.map((doc) => {
          const isAesthetic = doc.practice === 'aesthetic';
          const docAppointments = dateAppointments.filter(a => a.doctorId === doc.id && a.status !== 'canceled' && a.status !== 'rescheduled');
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
                    const docSlotAppts = getAppointmentsForDoctorAndSlot(doc.id, slot, docInterval);

                    // Case 1: Slot has one or more booked appointments
                    if (docSlotAppts.length > 0) {
                      return docSlotAppts.map((apt) => {
                        const isCompleted = apt.status === 'completed';
                        const isRescheduled = apt.status === 'rescheduled';
                        const isCanceled = apt.status === 'canceled';
                        const isInactive = isCompleted || isRescheduled || isCanceled;

                        const cardBgClass = isRescheduled
                          ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                          : isCanceled
                            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                            : isCompleted
                              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                              : isAesthetic
                                ? 'bg-indigo-50/80 hover:bg-indigo-100/70 border-indigo-200 text-indigo-950 shadow-2xs'
                                : 'bg-teal-50/80 hover:bg-teal-100/70 border-teal-200 text-teal-950 shadow-2xs';

                        return (
                          <div 
                            key={apt.id}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between h-[92px] shadow-2xs ${cardBgClass}`}
                          >
                            <div className="flex items-start justify-between gap-1 w-full">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="font-extrabold text-xs text-slate-900 truncate max-w-[85px]" title={apt.patientName}>
                                    {apt.patientName}
                                  </p>
                                  <span className="text-[8px] px-1 py-0.2 rounded font-bold bg-white/90 border border-slate-200 text-slate-600 shrink-0">
                                    {(() => {
                                      const p = patients.find(pat => pat.id === apt.patientId);
                                      return p ? getPatientFileNumberDisplay(p, apt.practice) : toFarsiDigits(apt.fileNumber);
                                    })()}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5" title={apt.serviceName || 'ویزیت عمومی'}>
                                  {apt.serviceName || 'ویزیت عمومی'}
                                </p>
                              </div>

                              <span className="text-xs font-black text-slate-800 dir-ltr shrink-0">{isFarsiSlot}</span>
                            </div>

                            <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-200/60">
                              {/* Status Badge */}
                              {isCompleted ? (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9px] flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> تکمیل
                                </span>
                              ) : isCanceled ? (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[9px] flex items-center gap-0.5">
                                  <XCircle className="w-2.5 h-2.5 text-rose-600" /> لغو شد
                                </span>
                              ) : isRescheduled ? (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[9px] flex items-center gap-0.5">
                                  <ArrowRightLeft className="w-2.5 h-2.5 text-amber-600" /> منتقل شد
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[9px]">
                                  رزرو شده
                                </span>
                              )}

                              {/* Only Cancel / Reschedule Action */}
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
                      });
                    }

                    // Case 2: Empty available booking slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => openNewAppointment({ doctorId: doc.id, date: selectedDate, timeSlot: isFarsiSlot, isSlotBooking: true })}
                        className="p-3 bg-white border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl text-right hover:shadow-xs transition-all flex flex-col justify-between h-[92px] group active:scale-95 cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-black text-slate-800 dir-ltr">{isFarsiSlot}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-black text-emerald-600">خالی</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-100">
                          <span className="text-[9px] text-slate-400 font-bold group-hover:text-emerald-600 transition-colors">
                            ثبت نوبت ←
                          </span>
                        </div>
                      </button>
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

