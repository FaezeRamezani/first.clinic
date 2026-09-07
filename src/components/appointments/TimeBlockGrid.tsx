import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { getJalaliDaysOfWeek, toFarsiDigits } from '../../utils/persianUtils';
import { 
  Clock, 
  Sparkles, 
  Stethoscope, 
  UserCheck, 
  Plus,
  CheckCircle2
} from 'lucide-react';

export const TimeBlockGrid: React.FC = () => {
  const { scope, appointments, doctors, setIsNewAppointmentOpen, openQuickCheckout, updateAppointmentStatus } = useClinic();
  
  const [selectedInterval, setSelectedInterval] = useState<number>(30); // 15, 30, 45, 60
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('۱۴۰۵-۰۶-۱۶');

  const daysOfWeek = getJalaliDaysOfWeek();

  // Generate time slots based on interval (from 09:00 to 20:00)
  const generateTimeSlots = (intervalMinutes: number) => {
    const slots: string[] = [];
    let currentMinutes = 9 * 60; // 09:00
    const endMinutes = 20 * 60; // 20:00

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(formatted);
      currentMinutes += intervalMinutes;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots(selectedInterval);

  // Filter appointments for timetable
  const filteredAppointments = appointments.filter(a => {
    const scopeMatch = scope === 'unified' || a.practice === scope;
    const docMatch = selectedDoctorId === 'all' || a.doctorId === selectedDoctorId;
    const dateMatch = a.date === selectedDate;
    return scopeMatch && docMatch && dateMatch;
  });

  const getAppointmentForSlot = (slot: string) => {
    // Basic match check (or slot prefix)
    return filteredAppointments.find(a => toFarsiDigits(a.timeSlot) === toFarsiDigits(slot));
  };

  return (
    <div className="space-y-4">
      
      {/* Timetable Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Day Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {daysOfWeek.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate('۱۴۰۵-۰۶-۱۶')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                i === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{d.day}</span>
              <span className="text-[10px] opacity-80 mr-1">({d.date})</span>
            </button>
          ))}
        </div>

        {/* Filters: Interval & Doctor */}
        <div className="flex items-center gap-3">
          
          {/* Interval Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-bold px-2">بازه زمان:</span>
            {[15, 30, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => setSelectedInterval(mins)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedInterval === mins ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {toFarsiDigits(mins)} دقیقه
              </button>
            ))}
          </div>

          {/* Doctor Filter */}
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="all">همه پزشکان</option>
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Graphical Time Blocks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800">جدول زمانی رزرو نوبت‌ها ({selectedDate})</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> مطب زیبایی (بنفش)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> مطب دندانپزشکی (فیروزه‌ای)
            </span>
          </div>
        </div>

        {/* Grid List */}
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {timeSlots.map((slot) => {
            const apt = getAppointmentForSlot(slot);
            const isFarsiSlot = toFarsiDigits(slot);

            return (
              <div key={slot} className="flex items-stretch min-h-[60px] hover:bg-slate-50/50 transition-colors">
                
                {/* Time slot column */}
                <div className="w-24 bg-slate-50/80 border-l border-slate-200 px-3 py-3 font-bold text-slate-700 text-xs text-center flex flex-col justify-center shrink-0">
                  <span className="dir-ltr">{isFarsiSlot}</span>
                </div>

                {/* Content Block */}
                <div className="flex-1 p-2 flex items-center">
                  {apt ? (
                    <div className={`w-full p-3 rounded-xl border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      apt.practice === 'aesthetic'
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                        : 'bg-teal-50/70 border-teal-200 text-teal-950'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                          apt.practice === 'aesthetic' ? 'bg-indigo-600' : 'bg-teal-600'
                        }`}>
                          {apt.practice === 'aesthetic' ? <Sparkles className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{apt.patientName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-white/80 border border-slate-200 text-slate-600">
                              {toFarsiDigits(apt.fileNumber)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 font-medium">
                            {apt.serviceName || 'ویزیت عمومی'} • {apt.doctorName}
                          </p>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2">
                        {apt.status === 'pending' && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'checked_in')}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs"
                          >
                            ثبت ورود
                          </button>
                        )}
                        {apt.status === 'checked_in' && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> حاضر در مطب
                          </span>
                        )}
                        {apt.status === 'completed' && (
                          <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> تسویه‌شده
                          </span>
                        )}

                        {apt.status !== 'completed' && (
                          <button
                            onClick={() => openQuickCheckout(apt)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
                          >
                            تسویه ویزیت
                          </button>
                        )}
                      </div>

                    </div>
                  ) : (
                    <button
                      onClick={() => setIsNewAppointmentOpen(true)}
                      className="w-full h-full min-h-[44px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 text-xs font-medium transition-all group"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>رزرو زمان خالی ({isFarsiSlot})</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
