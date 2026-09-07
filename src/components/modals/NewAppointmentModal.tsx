import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X } from 'lucide-react';

export const NewAppointmentModal: React.FC = () => {
  const { 
    isNewAppointmentOpen, 
    setIsNewAppointmentOpen, 
    patients, 
    doctors, 
    services, 
    addAppointment 
  } = useClinic();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [tempPatientName, setTempPatientName] = useState<string>('');
  const [tempPatientMobile, setTempPatientMobile] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('doc-1');
  const [date, setDate] = useState<string>('۱۴۰۵-۰۶-۱۶');
  const [timeSlot, setTimeSlot] = useState<string>('۱۱:۰۰');
  const [serviceId, setServiceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isNewAppointmentOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let patName = tempPatientName;
    let patMobile = tempPatientMobile;
    let fileNum = `CL-${1000 + patients.length + 1}`;
    let patId = selectedPatientId;

    if (selectedPatientId) {
      const existing = patients.find(p => p.id === selectedPatientId);
      if (existing) {
        patName = existing.name;
        patMobile = existing.mobile;
        fileNum = existing.fileNumber;
      }
    }

    if (!patName) return;

    const doc = doctors.find(d => d.id === doctorId) || doctors[0];
    const srv = services.find(s => s.id === serviceId);

    addAppointment({
      patientId: patId || `pat-${Date.now()}`,
      patientName: patName,
      patientMobile: patMobile || '۰۹۱۲۰۰۰۰۰۰۰',
      fileNumber: fileNum,
      doctorId: doc.id,
      doctorName: doc.name,
      practice: doc.practice,
      date,
      timeSlot,
      duration: 30,
      status: 'pending',
      serviceId: srv?.id,
      serviceName: srv?.name,
      notes,
      cabinetNumber: doc.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'
    });

    setIsNewAppointmentOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800">رزرو و ثبت نوبت جدید</h3>
          <button onClick={() => setIsNewAppointmentOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Select Existing Patient or Type Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">انتخاب بیمار از پرونده‌های موجود:</label>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                if (e.target.value) {
                  setTempPatientName('');
                  setTempPatientMobile('');
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="">-- ثبت بیمار موقت جدید --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.fileNumber} - {p.mobile})</option>
              ))}
            </select>
          </div>

          {!selectedPatientId && (
            <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نام بیمار جدید:</label>
                <input
                  type="text"
                  required={!selectedPatientId}
                  value={tempPatientName}
                  onChange={(e) => setTempPatientName(e.target.value)}
                  placeholder="مثلا: ناهید کاظمی"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره موبایل:</label>
                <input
                  type="text"
                  required={!selectedPatientId}
                  value={tempPatientMobile}
                  onChange={(e) => setTempPatientMobile(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>
          )}

          {/* Doctor Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">انتخاب پزشک / مطب target:</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
              ))}
            </select>
          </div>

          {/* Service Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">خدمت درخواستی (اختیاری):</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="">ویزیت / مشاوره عمومی</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.price.toLocaleString('fa-IR')} تومان)</option>
              ))}
            </select>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاریخ نوبت (شمسی):</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ساعت nobatslot:</label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="۱۰:۳۰"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">یادداشت منشی:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی نوبت..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewAppointmentOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              ثبت نوبت در تقویم
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
