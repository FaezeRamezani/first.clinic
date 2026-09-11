import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  getTodayJalaliDate, 
  getJalaliDateOffset, 
  getDateRelationToToday,
  formatJalaliDateLong,
  toFarsiDigits, 
  toEnglishDigits 
} from '../../utils/persianUtils';
import { isValidBookingSlot } from '../../utils/timeUtils';
import { 
  Sparkles, 
  Stethoscope, 
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRightLeft
} from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import type { PresenceStatus, Appointment } from '../../types';

export const TimeBlockGrid: React.FC = () => {
  const { 
    scope, 
    appointments, 
    doctors, 
    openNewAppointment, 
    openQuickCheckout, 
    updateAppointmentPresenceStatus,
    openCancelAppointment
  } = useClinic();
  
  const todayStr = getTodayJalaliDate();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedInterval, setSelectedInterval] = useState<number>(30); // 30 or 60
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  const dateRelation = getDateRelationToToday(selectedDate);

  // Doctors list based on Global Scope & Doctor Dropdown selection
  const scopeDoctors = doctors.filter(doc => scope === 'unified' || doc.practice === scope);

  // Reset selected doctor if no longer available in current practice scope
  useEffect(() => {
    if (selectedDoctorId !== 'all' && !scopeDoctors.some(d => d.id === selectedDoctorId)) {
      setSelectedDoctorId('all');
    }
  }, [scope, scopeDoctors, selectedDoctorId]);

  // Generate time slots based on interval (09:00 to 20:30)
  const generateTimeSlots = (intervalMinutes: number) => {
    const slots: string[] = [];
    let currentMinutes = 9 * 60; // 09:00
    const endMinutes = 20 * 60 + 30; // 20:30

    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(formatted);
      currentMinutes += intervalMinutes;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots(selectedInterval);

  // Filter ALL appointments matching scope and selected date (historical ones stay in calendar)
  const dateAppointments = appointments.filter(a => {
    const normApptDate = toEnglishDigits(a.date).trim().replace(/\//g, '-');
    const normSelDate = toEnglishDigits(selectedDate).trim().replace(/\//g, '-');
    return normApptDate === normSelDate;
  });

  // Get appointments for a specific doctor and slot block
  const getAppointmentsForDoctorAndSlot = (doctorId: string, slot: string) => {
    const slotHour = parseInt(toEnglishDigits(slot).split(':')[0], 10);
    const slotMin = parseInt(toEnglishDigits(slot).split(':')[1], 10);
    const slotTotalMins = slotHour * 60 + slotMin;
    const slotEndMins = slotTotalMins + selectedInterval;

    return dateAppointments.filter(a => {
      if (a.doctorId !== doctorId) return false;
      const apptTime = toEnglishDigits(a.timeSlot).trim();
      const parts = apptTime.split(':');
      if (parts.length < 2) return false;
      const apptMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return apptMins >= slotTotalMins && apptMins < slotEndMins;
    });
  };

  // State Machine Guards
  const handleCheckoutGuard = (apt: Appointment) => {
    if (apt.status === 'completed') {
      alert('این نوبت قبلاً کاملاً تسویه شده است.');
      return;
    }
    if (apt.status === 'canceled' || apt.status === 'rescheduled') {
      alert('نوبت‌های لغوشده یا منتقل‌شده قابل تسویه نمی‌باشند.');
      return;
    }
    openQuickCheckout(apt);
  };

  const handlePresenceGuard = (apt: Appointment, newPresence: PresenceStatus) => {
    if (apt.status === 'completed' || apt.status === 'canceled' || apt.status === 'rescheduled') {
      alert('پس از بسته‌شدن، لغو یا انتقال نوبت، امکان تغییر وضعیت حضور وجود ندارد.');
      return;
    }
    if (dateRelation === 'future') {
      alert('ثبت حضور برای تاریخ‌های آینده هنوز امکان‌پذیر نیست.');
      return;
    }
    updateAppointmentPresenceStatus(apt.id, newPresence);
  };

  const handleCancelGuard = (apt: Appointment) => {
    if (apt.status === 'completed') {
      alert('امکان تغییر یا لغو نوبت کامل‌شده وجود ندارد.');
      return;
    }
    openCancelAppointment(apt);
  };

  return (
    <div className="space-y-4">
      
      {/* Timetable Header Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* JalaliDatePicker & Quick Navigation Controls (Day nav panel removed per Section 2) */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Quick Date Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
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

          {/* Right Controls: Doctor Tabs Filter & Interval Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Doctor Selection Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <span className="text-slate-600 font-bold">انتخاب پزشک:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-500"
              >
                <option value="all">همه پزشکان</option>
                {scopeDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Interval Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <span className="text-slate-600 font-bold">بازه زمانی:</span>
              <select
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(Number(e.target.value))}
                className="bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer"
              >
                <option value={30}>۳۰ دقیقه</option>
                <option value={60}>۶۰ دقیقه</option>
              </select>
            </div>

          </div>

        </div>

        {/* Selected Date Subtitle */}
        <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>{formatJalaliDateLong(selectedDate)}</span>
          <span className="text-slate-400">
            تعداد کل نوبت‌های این روز: <strong className="text-indigo-600 font-bold">{toFarsiDigits(dateAppointments.length)}</strong> نوبت
          </span>
        </div>

      </div>

      {/* Side-by-Side Independent Doctor Calendars Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Doctor Header Banner (Fixed 2-Column Grid to prevent layout reflow when switching practice scope) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 border-b border-slate-200 bg-slate-50/70">
          {doctors.map((doc) => {
            const isAesthetic = doc.practice === 'aesthetic';
            const countForDoc = dateAppointments.filter(a => a.doctorId === doc.id).length;
            const isScopeMatch = scope === 'unified' || doc.practice === scope;
            const isDoctorSelected = selectedDoctorId === 'all' || selectedDoctorId === doc.id;
            const isVisible = isScopeMatch && isDoctorSelected;

            return (
              <div 
                key={doc.id} 
                onClick={() => {
                  if (!isScopeMatch) return;
                  setSelectedDoctorId(selectedDoctorId === doc.id ? 'all' : doc.id);
                }}
                title={isScopeMatch ? "برای فیلتر تک‌پزشک کلیک کنید" : "خارج از مطب فعال"}
                className={`p-4 flex items-center justify-between transition-all duration-200 ${
                  !isVisible 
                    ? 'opacity-20 pointer-events-none bg-slate-100/50 hidden md:flex' 
                    : isDoctorSelected && selectedDoctorId !== 'all'
                      ? 'bg-indigo-50/70 border-b-2 border-b-indigo-600 opacity-100 cursor-pointer' 
                      : 'bg-white/40 hover:bg-slate-100/50 opacity-100 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                    isAesthetic ? 'bg-indigo-600' : 'bg-teal-600'
                  }`}>
                    {isAesthetic ? <Sparkles className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-slate-900">{doc.name}</h3>
                      {!isScopeMatch ? (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-bold">غیرفعال در این مطب</span>
                      ) : isDoctorSelected && selectedDoctorId !== 'all' ? (
                        <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">انتخاب‌شده</span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{doc.specialty}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                  isAesthetic ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
                }`}>
                  {toFarsiDigits(countForDoc)} نوبت
                </span>
              </div>
            );
          })}
        </div>


        {/* Timetable Slot Rows Grid */}
        <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
          {timeSlots.map((slot) => {
            const isFarsiSlot = toFarsiDigits(slot);
            const isAllowedSlot = isValidBookingSlot(slot);

            return (
              <div key={slot} className="flex items-stretch min-h-[64px] hover:bg-slate-50/40 transition-colors">
                
                {/* Fixed Left Time Slot Marker */}
                <div className={`w-20 border-l border-slate-200 px-2 py-3 font-bold text-xs text-center flex flex-col justify-center shrink-0 select-none ${
                  isAllowedSlot ? 'bg-slate-50/90 text-slate-800' : 'bg-slate-100/60 text-slate-400'
                }`}>
                  <span className="dir-ltr text-sm font-black">{isFarsiSlot}</span>
                </div>

                {/* Side-by-Side Fixed Doctor Slot Columns (Preserves 2-column spatial layout) */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-2">
                  {doctors.map((doc) => {
                    const isScopeMatch = scope === 'unified' || doc.practice === scope;
                    const isDoctorSelected = selectedDoctorId === 'all' || selectedDoctorId === doc.id;
                    const isVisible = isScopeMatch && isDoctorSelected;
                    const docSlotAppts = getAppointmentsForDoctorAndSlot(doc.id, slot);
                    const isAesthetic = doc.practice === 'aesthetic';

                    return (
                      <div 
                        key={doc.id} 
                        className={`flex items-center min-h-[48px] transition-all duration-200 ${
                          !isVisible 
                            ? 'opacity-20 pointer-events-none select-none hidden md:flex' 
                            : 'opacity-100 pointer-events-auto'
                        }`}
                      >
                        {docSlotAppts.length > 0 ? (
                          <div className="w-full space-y-2">
                            {docSlotAppts.map((apt) => {
                              const isCompleted = apt.status === 'completed';
                              const isRescheduled = apt.status === 'rescheduled';
                              const isCanceled = apt.status === 'canceled';
                              const isInactive = isCompleted || isRescheduled || isCanceled;

                              // Muted/grayed styling for finalized or canceled/rescheduled historical records
                              const cardBgClass = isRescheduled
                                ? 'bg-amber-50/80 border-amber-300 text-amber-950 opacity-75 grayscale-25'
                                : isCanceled
                                  ? 'bg-rose-50/80 border-rose-300 text-rose-950 opacity-75 grayscale-25'
                                  : isCompleted
                                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 opacity-90 font-medium'
                                    : isAesthetic
                                      ? 'bg-purple-100/80 hover:bg-purple-100 border-purple-300 text-purple-950 font-bold shadow-2xs'
                                      : 'bg-teal-100/80 hover:bg-teal-100 border-teal-300 text-teal-950 font-bold shadow-2xs';

                              return (
                                <div 
                                  key={apt.id}
                                  className={`p-3 rounded-2xl border transition-all ${cardBgClass}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-extrabold text-xs text-slate-900">{apt.patientName}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/90 border border-slate-200 text-slate-600">
                                          {toFarsiDigits(apt.fileNumber)}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                                        {apt.serviceName || 'ویزیت عمومی'}
                                      </p>
                                    </div>

                                    {/* Status Badges & Controls */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      
                                      {/* Historical Status Badges */}
                                      {isRescheduled && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-[10px] flex items-center gap-1">
                                          <ArrowRightLeft className="w-3 h-3 text-amber-600" /> منتقل شد
                                        </span>
                                      )}

                                      {isCanceled && (
                                        <span className="px-2 py-0.5 bg-rose-100 text-rose-900 font-extrabold rounded-lg text-[10px] flex items-center gap-1">
                                          <XCircle className="w-3 h-3 text-rose-600" /> لغو شد
                                        </span>
                                      )}

                                      {isCompleted && (
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg text-[10px] flex items-center gap-1 border border-emerald-300">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ✓ تسویه‌شد
                                        </span>
                                      )}

                                      {/* Active Presence Dropdown (Disabled for completed/canceled/rescheduled) */}
                                      {!isInactive && (
                                        dateRelation === 'future' ? (
                                          <span className="px-2 py-0.5 bg-indigo-100/80 text-indigo-800 font-bold rounded-lg text-[10px]">
                                            زمان نرسیده
                                          </span>
                                        ) : (
                                          <select
                                            value={apt.presenceStatus || 'pending'}
                                            onChange={(e) => handlePresenceGuard(apt, e.target.value as PresenceStatus)}
                                            className="bg-white border border-slate-300 text-slate-800 text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                                          >
                                            <option value="pending">در انتظار</option>
                                            <option value="present">حاضر در مطب</option>
                                            <option value="absent">عدم حضور در مطب</option>
                                          </select>
                                        )
                                      )}

                                      {/* Active Checkout & Reschedule/Cancel Controls */}
                                      {!isInactive && dateRelation === 'today' && (
                                        <>
                                          <button
                                            onClick={() => handleCheckoutGuard(apt)}
                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                          >
                                            تسویه
                                          </button>

                                          <button
                                            onClick={() => handleCancelGuard(apt)}
                                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                          >
                                            لغو / جابجایی
                                          </button>
                                        </>
                                      )}

                                      {!isInactive && dateRelation === 'past' && (
                                        <button
                                          onClick={() => handleCheckoutGuard(apt)}
                                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                        >
                                          تعیین تکلیف / تسویه
                                        </button>
                                      )}

                                    </div>

                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          isAllowedSlot ? (
                            <button
                              onClick={() => openNewAppointment({ doctorId: doc.id, date: selectedDate, timeSlot: isFarsiSlot, isSlotBooking: true })}
                              disabled={!isVisible}
                              className="w-full h-full min-h-[42px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 text-[11px] font-medium transition-all group cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-indigo-500" />
                              <span>رزرو زمان خالی ({isFarsiSlot})</span>
                            </button>
                          ) : (
                            <div className="w-full h-full min-h-[42px] rounded-xl border border-slate-100 bg-slate-50/40 text-slate-300 flex items-center justify-center text-[10px] font-medium select-none">
                              <span>خارج از ساعت رزرو مجاز</span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
