import React, { useState, useEffect } from 'react';
import { useClinic, getPhysicalFileNumber, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { X, UserPlus, Search, UserCheck, Calendar, Check, Stethoscope, Sparkles, RefreshCw } from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { SearchableServiceSelect } from '../common/SearchableServiceSelect';
import { getTodayJalaliDate, toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
import { 
  validatePersianName, 
  validateIranianMobile, 
  normalizeDigits 
} from '../../utils/validation';
import type { Patient } from '../../types';

export const NewAppointmentModal: React.FC = () => {
  const { 
    isNewAppointmentOpen, 
    setIsNewAppointmentOpen,
    newAppointmentPrefill,
    setNewAppointmentPrefill,
    patients, 
    doctors, 
    services, 
    scope,
    addAppointment,
    addPatient,
    selectedPatient,
    checkAppointmentConflict,
    appointments
  } = useClinic();

  // Navigation Steps: 'select_patient_type' | 'details'
  const [step, setStep] = useState<'select_patient_type' | 'details'>('select_patient_type');
  
  // Patient Selection Mode & Form States
  const [patientTypeChoice, setPatientTypeChoice] = useState<'new' | 'existing'>('existing');
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>('');
  const [chosenPatient, setChosenPatient] = useState<Patient | null>(null);

  // New Patient Basic Info
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientMobile, setNewPatientMobile] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Appointment Form States
  const [doctorId, setDoctorId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayJalaliDate());
  const [timeSlot, setTimeSlot] = useState<string>('۱۰:۰۰');
  const [serviceId, setServiceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [conflictError, setConflictError] = useState<string>('');

  // Is this booking triggered directly from clicking a specific slot in Calendar/Grid?
  const isSlotBooking = !!newAppointmentPrefill?.isSlotBooking;

  // Is this a rescheduling flow for an existing appointment? (Fixed Doctor, Commit on final confirmation)
  const isRescheduleMode = !!newAppointmentPrefill?.previousAppointmentId;

  const handleClose = () => {
    setIsNewAppointmentOpen(false);
    setNewAppointmentPrefill(null);
  };

  useEffect(() => {
    if (isNewAppointmentOpen) {
      // 1. Check prefill patient first
      if (newAppointmentPrefill?.patient) {
        setChosenPatient(newAppointmentPrefill.patient);
        setStep('details');
      } else {
        setChosenPatient(null);
        setStep('select_patient_type');
      }

      // 2. Set Doctor, Date, TimeSlot from prefill if present
      const initialDocId = newAppointmentPrefill?.doctorId || '';
      setDoctorId(initialDocId);
      setDate(newAppointmentPrefill?.date || getTodayJalaliDate());
      setTimeSlot(newAppointmentPrefill?.timeSlot ? toFarsiDigits(newAppointmentPrefill.timeSlot) : '۱۰:۰۰');

      setServiceId('');
      setNotes('');
      setPatientSearchTerm('');
      setNewPatientName('');
      setNewPatientMobile('');
      setConflictError('');
      setPatientTypeChoice('existing');
    }
  }, [isNewAppointmentOpen, newAppointmentPrefill, doctors]);

  if (!isNewAppointmentOpen) return null;

  // Find currently selected doctor object
  const selectedDoctorObj = doctors.find(d => d.id === doctorId);

  // Filter services associated with the selected doctor's practice
  const availableServices = selectedDoctorObj
    ? services.filter(s => s.practice === selectedDoctorObj.practice && s.active)
    : [];

  // Handle Doctor Change with Service Reset logic (Section 4)
  const handleDoctorChange = (newDocId: string) => {
    const newDoc = doctors.find(d => d.id === newDocId);
    if (newDoc) {
      const newPracticeServices = services.filter(s => s.practice === newDoc.practice && s.active);
      const isCurrentServiceValid = newPracticeServices.some(s => s.id === serviceId);
      if (!isCurrentServiceValid) {
        setServiceId('');
      }
    } else {
      setServiceId('');
    }
    setDoctorId(newDocId);
    handleDateOrTimeOrDoctorChange(date, timeSlot, newDocId);
  };

  // Filter existing patients for Search Box
  const filteredPatients = patients.filter(p => {
    if (!patientSearchTerm.trim()) return false;
    const term = toEnglishDigits(patientSearchTerm).toLowerCase().trim();
    const nameMatch = p.name.toLowerCase().includes(term);
    const mobileMatch = toEnglishDigits(p.mobile).includes(term);
    const fileMatch = (p.fileNumber && toEnglishDigits(p.fileNumber).toLowerCase().includes(term)) ||
                      getPhysicalFileNumber(p, 'dental').includes(term) ||
                      getPhysicalFileNumber(p, 'aesthetic').includes(term);
    return nameMatch || mobileMatch || fileMatch;
  }).slice(0, 6);

  const handleDateOrTimeOrDoctorChange = (newDate: string, newSlot: string, newDocId: string) => {
    setDate(newDate);
    setTimeSlot(newSlot);
    setDoctorId(newDocId);

    if (newDocId) {
      const isConflict = checkAppointmentConflict(newDate, newSlot, newDocId, newAppointmentPrefill?.previousAppointmentId);
      if (isConflict) {
        const doc = doctors.find(d => d.id === newDocId);
        setConflictError(`⚠️ زمان ${newSlot} در تاریخ ${newDate} برای ${doc?.name || 'پزشک'} قبلاً پر شده است.`);
      } else {
        setConflictError('');
      }
    }
  };

  const handleSelectExistingPatient = (patient: Patient) => {
    setChosenPatient(patient);
    setStep('details');
  };

  const handleProceedWithNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const nameVal = validatePersianName(newPatientName, 'نام بیمار');
    if (!nameVal.isValid) {
      setValidationError(nameVal.error || 'نام بیمار معتبر نیست');
      return;
    }

    const mobileVal = validateIranianMobile(newPatientMobile);
    if (!mobileVal.isValid) {
      setValidationError(mobileVal.error || 'شماره موبایل معتبر نیست');
      return;
    }

    const cleanName = nameVal.normalized;
    const cleanMobile = mobileVal.normalized;

    setNewPatientName(cleanName);
    setNewPatientMobile(cleanMobile);

    // Check if patient with same mobile already exists to prevent duplicate creation!
    const existingPat = patients.find(p => p.mobile === cleanMobile);
    if (existingPat) {
      setChosenPatient(existingPat);
    }
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!doctorId) {
      alert('لطفاً ابتدا پزشک معالج را انتخاب کنید.');
      return;
    }

    if (checkAppointmentConflict(date, timeSlot, doctorId, newAppointmentPrefill?.previousAppointmentId)) {
      setConflictError('⚠️ تداخل زمان وجود دارد. لطفاً زمان دیگری انتخاب کنید.');
      return;
    }

    const doc = doctors.find(d => d.id === doctorId) || doctors[0];
    const srv = services.find(s => s.id === serviceId);

    let patId = chosenPatient ? chosenPatient.id : '';
    let patName = chosenPatient ? chosenPatient.name : newPatientName;
    let patMobile = chosenPatient ? chosenPatient.mobile : (newPatientMobile || '۰۹۱۲۰۰۰۰۰۰۰');

    // Check once again if new patient mobile matches existing patient to avoid duplicates
    if (!chosenPatient && newPatientMobile) {
      const existing = patients.find(p => p.mobile === normalizeDigits(newPatientMobile.trim()));
      if (existing) {
        patId = existing.id;
        patName = existing.name;
        patMobile = existing.mobile;
      }
    }

    // If still no patient ID (genuinely brand new patient), create new patient record first
    if (!patId) {
      try {
        const nameVal = validatePersianName(patName, 'نام بیمار');
        const mobVal = validateIranianMobile(patMobile);
        if (!nameVal.isValid || !mobVal.isValid) {
          alert(nameVal.error || mobVal.error || 'اطلاعات بیمار معتبر نیست');
          return;
        }

        const createdPat = await addPatient({
          name: nameVal.normalized,
          mobile: mobVal.normalized,
          nationalId: '',
          primaryPractice: doc.practice,
          profileStatus: 'incomplete',
          memberships: [],
          allergies: [],
          medicalNotes: '',
          emergencyContact: { name: '-', phone: '-', relation: '-' }
        });
        if (createdPat) {
          patId = createdPat.id;
          patName = createdPat.name;
          patMobile = createdPat.mobile;
        }
      } catch (err) {
        console.error('Error creating patient before appointment:', err);
        return;
      }
    }

    const targetPatientObj = patients.find(p => p.id === patId);
    const fileNum = targetPatientObj ? (getPhysicalFileNumber(targetPatientObj, doc.practice) || targetPatientObj.fileNumber || '') : '';

    // FINAL COMMIT happens here on submit!
    addAppointment({
      patientId: patId,
      patientName: patName,
      patientMobile: patMobile,
      fileNumber: fileNum,
      doctorId: doc.id,
      doctorName: doc.name,
      practice: doc.practice,
      date: date || getTodayJalaliDate(),
      timeSlot: timeSlot || '۱۰:۰۰',
      duration: 30,
      status: 'pending',
      serviceId: srv?.id,
      serviceName: srv?.name,
      notes,
      previousAppointmentId: newAppointmentPrefill?.previousAppointmentId,
      cabinetNumber: doc.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            {isRescheduleMode ? (
              <RefreshCw className="w-5 h-5 text-indigo-600" />
            ) : (
              <Calendar className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className="text-sm font-bold text-slate-800">
              {isRescheduleMode ? 'تغییر نوبت (تعیین زمان جدید)' : 'ثبت نوبت جدید در تقویم'}
            </h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Decision Modal for Patient Type */}
        {step === 'select_patient_type' && (
          <div className="space-y-4 text-xs">
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">برای چه نوع بیماری می‌خواهید نوبت ثبت کنید؟</h4>
              <p className="text-slate-500 font-medium text-[11px]">لطفاً نوع پرونده بیمار را مشخص کنید.</p>
            </div>

            {/* Option Switcher */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPatientTypeChoice('existing')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  patientTypeChoice === 'existing'
                    ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  {patientTypeChoice === 'existing' && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <div>
                  <p className="font-extrabold text-xs">۱. بیمار دارای پرونده</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">جستجو در سیستم با شماره پرونده یا شماره همراه</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPatientTypeChoice('new')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  patientTypeChoice === 'new'
                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  {patientTypeChoice === 'new' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <p className="font-extrabold text-xs">۲. بیمار جدید</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">دریافت سریع نام و شماره همراه جهت ثبت نوبت</p>
                </div>
              </button>
            </div>

            {/* Existing Patient Search Section */}
            {patientTypeChoice === 'existing' && (
              <div className="space-y-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    placeholder="جستجوی بیمار با شماره پرونده یا شماره همراه..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                {patientSearchTerm.trim() && filteredPatients.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4">بیماری با این شماره پرونده یا همراه یافت نشد.</p>
                )}

                {filteredPatients.length > 0 && (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectExistingPatient(p)}
                        className="p-2.5 hover:bg-indigo-50/70 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium dir-ltr text-right">
                            {toFarsiDigits(p.mobile)}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 text-indigo-700 rounded-lg text-[10px] font-extrabold dir-ltr">
                          {getPatientFileNumberDisplay(p, selectedDoctorObj ? selectedDoctorObj.practice : scope)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Patient Form Section */}
            {patientTypeChoice === 'new' && (
              <form onSubmit={handleProceedWithNewPatient} className="space-y-3 pt-2">
                {validationError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold animate-in fade-in">
                    {validationError}
                  </div>
                )}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی بیمار جدید:</label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => {
                      setNewPatientName(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="مثلا: مریم رضایی"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره همراه:</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={newPatientMobile}
                    onChange={(e) => {
                      setNewPatientMobile(normalizeDigits(e.target.value));
                      if (validationError) setValidationError('');
                    }}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500 dir-ltr text-right"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  ادامه و تعیین زمان نوبت
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: Appointment Details Form */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Patient Read-only Summary Banner */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900 text-xs">
                  بیمار: {chosenPatient ? chosenPatient.name : newPatientName}
                </p>
                <p className="text-[10px] text-slate-600 font-medium dir-ltr text-right">
                  {toFarsiDigits(chosenPatient ? chosenPatient.mobile : newPatientMobile)}
                  {chosenPatient && ` | پرونده: ${getPatientFileNumberDisplay(chosenPatient, selectedDoctorObj ? selectedDoctorObj.practice : scope)}`}
                </p>
              </div>
              {!selectedPatient && !newAppointmentPrefill?.patient && !isRescheduleMode && (
                <button
                  type="button"
                  onClick={() => setStep('select_patient_type')}
                  className="text-[10px] text-indigo-700 hover:underline font-bold"
                >
                  تغییر بیمار
                </button>
              )}
            </div>

            {/* SECTION 1: READ-ONLY SLOT BOOKING BANNER (When clicked from Calendar slot) */}
            {isSlotBooking ? (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 font-bold text-xs text-amber-950">
                <div className="flex items-center justify-between">
                  <span>پزشک: <strong className="text-slate-900">{selectedDoctorObj?.name || '-'}</strong> ({selectedDoctorObj?.specialty || ''})</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-extrabold">مشخص‌شده از Slot</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 text-[11px] pt-1 border-t border-amber-200/60">
                  <span>تاریخ: <strong className="dir-ltr inline-block text-slate-900">{toFarsiDigits(date)}</strong></span>
                  <span>ساعت: <strong className="dir-ltr inline-block text-slate-900">{toFarsiDigits(timeSlot)}</strong></span>
                </div>
              </div>
            ) : (
              /* DOCTOR SELECTION (Only when not booking from slot) */
              <div>
                <label className="block font-bold text-slate-700 mb-1">پزشک معالج / مطب:</label>
                {isRescheduleMode ? (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedDoctorObj?.practice === 'aesthetic' ? (
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                      )}
                      <span>{selectedDoctorObj?.name || 'پزشک فعلی'} ({selectedDoctorObj?.specialty})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-extrabold">پزشک ثابت</span>
                  </div>
                ) : (
                  <select
                    value={doctorId}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">-- انتخاب پزشک معالج --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* SECTION 4: SERVICE SELECTION (Bound to Doctor/Practice & Disabled if no doctor) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">خدمت درخواستی (وابسته به پزشک):</label>
              <SearchableServiceSelect
                services={availableServices}
                selectedServiceId={serviceId}
                onChange={(srvId) => setServiceId(srvId)}
                placeholder={!doctorId ? 'ابتدا پزشک را انتخاب کنید' : 'جستجوی خدمت...'}
                disabled={!doctorId}
              />
              {!doctorId && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">⚠️ ابتدا پزشک را انتخاب کنید تا خدمات مرتبط نمایش داده شوند.</p>
              )}
            </div>

            {/* DATE & TIME SELECTION (Only rendered when NOT slot booking) */}
            {!isSlotBooking && (
              <>
                <div>
                  <JalaliDatePicker
                    label="تاریخ نوبت (شمسی):"
                    value={date}
                    minDate={getTodayJalaliDate()}
                    onChange={(newDate) => handleDateOrTimeOrDoctorChange(newDate || getTodayJalaliDate(), timeSlot, doctorId)}
                  />
                </div>

                <div>
                  <TimeSlotPicker
                    value={timeSlot}
                    onChange={(newSlot) => handleDateOrTimeOrDoctorChange(date, newSlot, doctorId)}
                    date={date}
                    doctorId={doctorId}
                    appointments={appointments}
                    excludeAppointmentId={newAppointmentPrefill?.previousAppointmentId}
                  />
                </div>
              </>
            )}

            {/* Conflict Warning */}
            {conflictError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
                {conflictError}
              </div>
            )}

            {/* FORM ORDER STEP 5: NOTES */}
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

            {/* FORM ORDER STEP 6: SUBMIT / CANCEL BUTTONS */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!!conflictError || !doctorId}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors ${
                  conflictError || !doctorId
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isRescheduleMode ? 'تأیید نهایی تغییر نوبت' : 'ثبت نوبت در تقویم'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
