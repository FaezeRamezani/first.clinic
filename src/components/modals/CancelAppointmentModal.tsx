import React, { useState } from 'react';
import { X, CalendarX, RefreshCw, AlertTriangle, Check, PhoneOff, UserX, FileText } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';

export const CancelAppointmentModal: React.FC = () => {
  const { 
    isCancelAppointmentOpen, 
    setIsCancelAppointmentOpen, 
    selectedAppointmentForCancel, 
    cancelAppointment,
    openNewAppointment,
    patients
  } = useClinic();

  const [mode, setMode] = useState<'reschedule' | 'no_replacement'>('reschedule');
  const [selectedReason, setSelectedReason] = useState<string>('عدم پاسخگویی بیمار');
  const [customReasonNote, setCustomReasonNote] = useState<string>('');

  React.useEffect(() => {
    if (isCancelAppointmentOpen) {
      setMode('reschedule');
      setSelectedReason('عدم پاسخگویی بیمار');
      setCustomReasonNote('');
    }
  }, [isCancelAppointmentOpen]);

  if (!isCancelAppointmentOpen || !selectedAppointmentForCancel) return null;

  const handleConfirm = () => {
    const apt = selectedAppointmentForCancel;
    const finalReason = selectedReason === 'سایر موارد' 
      ? (customReasonNote || 'لغو توسط منشی') 
      : selectedReason;

    if (mode === 'reschedule') {
      // 1. Close Cancel modal FIRST without modifying appointment in context (SELECT != COMMIT)
      setIsCancelAppointmentOpen(false);

      // 2. Open New Appointment modal pre-filled with patient, fixed doctor, and previousAppointmentId
      const matchingPatient = patients.find(p => p.id === apt.patientId) || null;
      openNewAppointment({
        patient: matchingPatient,
        doctorId: apt.doctorId,
        previousAppointmentId: apt.id
      });
    } else {
      // Mark previous appointment as canceled (no replacement) with reason
      cancelAppointment(apt.id, 'no_replacement', finalReason);
      setIsCancelAppointmentOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-2xs">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-rose-950 text-sm">تغییر یا لغو نوبت بیمار</h3>
              <p className="text-[11px] text-rose-700 font-medium">
                بیمار: {selectedAppointmentForCancel.patientName} ({toFarsiDigits(selectedAppointmentForCancel.fileNumber)})
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCancelAppointmentOpen(false)}
            className="p-1.5 rounded-xl hover:bg-rose-200/50 text-rose-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5 text-amber-950 text-[11px] font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              رکورد این نوبت در جدول همان روز به صورت خاکستری باقی می‌ماند و پاک نخواهد شد.
            </p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">اقدام موردنظر را انتخاب کنید:</label>
            <div className="grid grid-cols-1 gap-2">
              
              {/* Option 1: Reschedule */}
              <button
                type="button"
                onClick={() => setMode('reschedule')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                  mode === 'reschedule'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs">گزینه ۱: تغییر نوبت و تعیین زمان جدید</p>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                      نوبت قبلی «منتقل شد» می‌شود و فرم نوبت جدید رزرو می‌گردد.
                    </p>
                  </div>
                </div>
                {mode === 'reschedule' && <Check className="w-4 h-4 text-indigo-600" />}
              </button>

              {/* Option 2: Cancel to unassigned list */}
              <button
                type="button"
                onClick={() => setMode('no_replacement')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                  mode === 'no_replacement'
                    ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarX className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs">گزینه ۲: لغو نوبت و انتقال به لیست بدون نوبت</p>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                      نوبت «لغو شد» می‌شود و بیمار وارد کارتابل پیگیری می‌گردد.
                    </p>
                  </div>
                </div>
                {mode === 'no_replacement' && <Check className="w-4 h-4 text-rose-600" />}
              </button>

            </div>
          </div>

          {/* Reasons for Option 2 or Option 1 */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block font-bold text-slate-700">دلیل لغو / عدم حضور:</label>
            <div className="grid grid-cols-3 gap-1.5">
              
              <button
                type="button"
                onClick={() => setSelectedReason('عدم پاسخگویی بیمار')}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedReason === 'عدم پاسخگویی بیمار'
                    ? 'bg-rose-600 text-white border-rose-600 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="text-[10px]">عدم پاسخگویی</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReason('لغو توسط بیمار')}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedReason === 'لغو توسط بیمار'
                    ? 'bg-rose-600 text-white border-rose-600 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span className="text-[10px]">لغو توسط بیمار</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReason('سایر موارد')}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedReason === 'سایر موارد'
                    ? 'bg-rose-600 text-white border-rose-600 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px]">سایر موارد</span>
              </button>

            </div>

            {selectedReason === 'سایر موارد' && (
              <textarea
                rows={2}
                value={customReasonNote}
                onChange={(e) => setCustomReasonNote(e.target.value)}
                placeholder="توضیحات تکمیلی علت لغو..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-rose-500 text-slate-800 font-medium mt-1"
              />
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsCancelAppointmentOpen(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              mode === 'reschedule' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <span>{mode === 'reschedule' ? 'ادامه و انتخاب زمان جدید' : 'تأیید لغو و انتقال به کارتابل'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
