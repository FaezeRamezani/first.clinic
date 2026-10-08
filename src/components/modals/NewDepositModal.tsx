import React, { useState, useEffect, useMemo } from 'react';
import {
  useClinic,
  hasPracticeMembership,
  getPatientFileNumberDisplay
} from '../../context/ClinicContext';
import {
  formatCurrency,
  toFarsiDigits,
  getTodayJalaliDate,
  toEnglishDigits
} from '../../utils/persianUtils';
import {
  X,
  User,
  Sparkles,
  Stethoscope,
  CreditCard,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { MoneyInput } from '../common/MoneyInput';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { SearchableServiceSelect } from '../common/SearchableServiceSelect';
import type { Patient, PracticeType } from '../../types';

export const NewDepositModal: React.FC = () => {
  const {
    isNewDepositOpen,
    setIsNewDepositOpen,
    newDepositPrefill,
    patients,
    services,
    doctors,
    appointments,
    scope,
    addDeposit,
    checkAppointmentConflict,
    getPracticePaymentAccounts
  } = useClinic();

  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Patient Selection
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 2: Practice Selection
  const [selectedPractice, setSelectedPractice] = useState<PracticeType>('aesthetic');

  // Step 3: Suggested Service
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(500000);

  // Step 4: Appointment
  const [appointmentMode, setAppointmentMode] = useState<'pending_schedule' | 'existing' | 'new'>('pending_schedule');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [newApptDate, setNewApptDate] = useState<string>(getTodayJalaliDate());
  const [newApptTimeSlot, setNewApptTimeSlot] = useState<string>('۱۰:۰۰');
  const [newApptDuration, setNewApptDuration] = useState<number>(30);
  const [newApptCabinet, setNewApptCabinet] = useState<string>('');
  const [newApptNotes, setNewApptNotes] = useState<string>('');
  const [apptConflictError, setApptConflictError] = useState<string>('');

  // Step 5: Payment Receipt Details
  const [paymentDate, setPaymentDate] = useState<string>(getTodayJalaliDate());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'>('pos_aesthetic');
  const [posAccount, setPosAccount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize modal state on open
  useEffect(() => {
    if (isNewDepositOpen) {
      setCurrentStep(1);
      setPatientSearchQuery('');
      setErrorMessage('');
      setApptConflictError('');

      // Prefill if provided
      if (newDepositPrefill?.patient) {
        setSelectedPatient(newDepositPrefill.patient);
        if (newDepositPrefill.practice) {
          setSelectedPractice(newDepositPrefill.practice);
        } else if (newDepositPrefill.patient.primaryPractice) {
          setSelectedPractice(newDepositPrefill.patient.primaryPractice);
        }
        setCurrentStep(2);
      } else {
        setSelectedPatient(null);
        if (scope !== 'unified') {
          setSelectedPractice(scope);
        } else {
          setSelectedPractice('aesthetic');
        }
      }

      setSelectedServiceId('');
      setDepositAmount(500000);
      setAppointmentMode('pending_schedule');
      setSelectedAppointmentId('');
      setNewApptDate(getTodayJalaliDate());
      setNewApptTimeSlot('۱۰:۰۰');
      setNewApptDuration(30);
      setNewApptCabinet('');
      setNewApptNotes('');
      setPaymentDate(getTodayJalaliDate());
      setNotes('');

      const accounts = getPracticePaymentAccounts(selectedPractice);
      setPosAccount(accounts[0] || 'کارتخوان');
      setPaymentMethod(selectedPractice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
    }
  }, [isNewDepositOpen, newDepositPrefill, scope]);

  // Sync payment accounts when practice changes
  useEffect(() => {
    const accounts = getPracticePaymentAccounts(selectedPractice);
    setPosAccount(accounts[0] || (selectedPractice === 'aesthetic' ? 'کارتخوان زیبایی' : 'کارتخوان دندان'));
    setPaymentMethod(selectedPractice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
    setSelectedServiceId('');
  }, [selectedPractice]);

  // Filtered patients for search in Step 1
  const searchedPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients.slice(0, 15);
    const q = patientSearchQuery.trim().toLowerCase();
    const qEn = toEnglishDigits(q);
    return patients.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const mobileMatch = p.mobile.includes(qEn);
      const natMatch = p.nationalId ? p.nationalId.includes(qEn) : false;
      const memMatch = p.memberships?.some(m => m.physicalFileNumber.includes(qEn));
      return nameMatch || mobileMatch || natMatch || memMatch;
    }).slice(0, 20);
  }, [patients, patientSearchQuery]);

  // Services of the selected clinic in Step 3
  const clinicServices = useMemo(() => {
    return services.filter(s => s.practice === selectedPractice && s.active !== false);
  }, [services, selectedPractice]);

  const selectedService = useMemo(() => {
    return clinicServices.find(s => s.id === selectedServiceId);
  }, [clinicServices, selectedServiceId]);

  // Existing upcoming appointments for this patient in selected practice
  const patientExistingAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments.filter(a =>
      a.patientId === selectedPatient.id &&
      a.practice === selectedPractice &&
      a.status !== 'canceled' &&
      a.status !== 'completed'
    );
  }, [appointments, selectedPatient, selectedPractice]);

  // Doctor for selected clinic
  const clinicDoctor = useMemo(() => {
    return doctors.find(d => d.practice === selectedPractice);
  }, [doctors, selectedPractice]);

  // Check appointment conflict when date or slot changes
  const checkConflict = (date: string, slot: string) => {
    if (!clinicDoctor) return false;
    const isConflict = checkAppointmentConflict(date, slot, clinicDoctor.id);
    if (isConflict) {
      setApptConflictError(`زمان ${slot} در تاریخ ${date} برای پزشک قبلاً رزرو شده است.`);
      return true;
    } else {
      setApptConflictError('');
      return false;
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const srv = clinicServices.find(s => s.id === serviceId);
    if (srv && srv.price > 0) {
      // Suggest half tariff or full tariff as initial proposal if not set
      if (!depositAmount || depositAmount === 500000) {
        setDepositAmount(Math.round(srv.price * 0.3)); // 30% suggested deposit
      }
    }
  };

  // Step Validation
  const canProceedStep = () => {
    if (currentStep === 1) return selectedPatient !== null;
    if (currentStep === 2) return selectedPractice !== null;
    if (currentStep === 3) return depositAmount > 0;
    if (currentStep === 4) {
      if (appointmentMode === 'existing') return !!selectedAppointmentId;
      if (appointmentMode === 'new') return !apptConflictError && !!newApptDate && !!newApptTimeSlot;
      return true; // pending_schedule
    }
    if (currentStep === 5) return depositAmount > 0 && !!posAccount;
    return true;
  };

  const handleNextStep = () => {
    setErrorMessage('');
    if (!canProceedStep()) {
      if (currentStep === 1) setErrorMessage('لطفاً یک بیمار را از لیست انتخاب کنید.');
      else if (currentStep === 3) setErrorMessage('لطفاً مبلغ بیعانه را مشخص کنید.');
      else if (currentStep === 4 && appointmentMode === 'new' && apptConflictError) setErrorMessage(apptConflictError);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Final Submission
  const handleSubmitDeposit = async () => {
    if (!selectedPatient) return;
    if (depositAmount <= 0) {
      setErrorMessage('مبلغ بیعانه باید بزرگتر از صفر باشد.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let newApptPayload = null;
      let existingApptId = null;

      if (appointmentMode === 'existing') {
        existingApptId = selectedAppointmentId;
      } else if (appointmentMode === 'new') {
        newApptPayload = {
          date: newApptDate,
          timeSlot: newApptTimeSlot,
          duration: newApptDuration,
          cabinetNumber: newApptCabinet || (selectedPractice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'),
          notes: newApptNotes || `نوبت تعیین‌شده با بیعانه (${depositAmount.toLocaleString('fa-IR')} تومان)`
        };
      }

      await addDeposit({
        patientId: selectedPatient.id,
        practice: selectedPractice,
        serviceId: selectedServiceId || null,
        appointmentId: existingApptId,
        newAppointment: newApptPayload,
        amount: depositAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        posAccount: posAccount,
        notes: notes || undefined
      });

      setIsNewDepositOpen(false);
    } catch (err: any) {
      console.error('Failed to create deposit:', err);
      setErrorMessage(err.message || 'خطا در ثبت بیعانه');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isNewDepositOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">پرداخت و ثبت بیعانه نوبت</h3>
              <p className="text-[11px] text-slate-500 font-medium">مرحله {toFarsiDigits(currentStep)} از ۵</p>
            </div>
          </div>
          <button
            onClick={() => setIsNewDepositOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'انتخاب بیمار' },
              { step: 2, title: 'مطب' },
              { step: 3, title: 'خدمت' },
              { step: 4, title: 'نوبت' },
              { step: 5, title: 'دریافت' }
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === s.step
                      ? 'bg-indigo-600 text-white shadow-xs scale-105'
                      : currentStep > s.step
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > s.step ? <Check className="w-4 h-4" /> : toFarsiDigits(s.step)}
                </div>
                <span className={`text-[10px] font-bold ${currentStep === s.step ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* STEP 1: Select Patient */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  جستجو و انتخاب بیمار:
                </label>
                <p className="text-[11px] text-slate-500 mb-2 font-medium">
                  فقط بیماران دارای پرونده قبلی در سامانه قابل انتخاب هستند.
                </p>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    placeholder="جستجو با نام، موبایل، کدملی یا شماره پرونده..."
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Selected Patient Banner if selected */}
              {selectedPatient && (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      {selectedPatient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-indigo-950 text-xs">{selectedPatient.name}</p>
                      <p className="text-[11px] text-indigo-700 font-medium">
                        شماره پرونده: {getPatientFileNumberDisplay(selectedPatient)} | موبایل: {toFarsiDigits(selectedPatient.mobile)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
                    انتخاب شد
                  </span>
                </div>
              )}

              {/* Patient Results List */}
              <div className="border border-slate-200 rounded-2xl max-h-[260px] overflow-y-auto divide-y divide-slate-100">
                {searchedPatients.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    بیماری با این مشخصات یافت نشد.
                  </div>
                ) : (
                  searchedPatients.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    const hasD = hasPracticeMembership(p, 'dental');
                    const hasA = hasPracticeMembership(p, 'aesthetic');
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-slate-800 font-bold">{p.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {toFarsiDigits(p.mobile)} {p.nationalId ? `• کدملی: ${toFarsiDigits(p.nationalId)}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px]">
                          {hasA && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 rounded font-bold">زیبایی</span>
                          )}
                          {hasD && (
                            <span className="px-1.5 py-0.5 bg-teal-100 text-teal-900 rounded font-bold">دندان</span>
                          )}
                          <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {getPatientFileNumberDisplay(p)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Select Practice */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  انتخاب مطب دریافت‌کننده بیعانه:
                </label>
                <p className="text-[11px] text-slate-500 mb-4 font-medium">
                  بیعانه مستقل از سایر مطب‌ها ثبت شده و پزشک و خدمات مرتبط با همین مطب فعال خواهند شد.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clinic 1: Aesthetic */}
                <div
                  onClick={() => setSelectedPractice('aesthetic')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    selectedPractice === 'aesthetic'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    {selectedPractice === 'aesthetic' && (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">مطب زیبایی</h4>
                    <p className="text-[11px] text-purple-800 font-bold mt-0.5">دکتر فهیمه رمضانی</p>
                    <p className="text-[10px] text-slate-500 mt-1">تزریق بوتاکس، فیلر، مزوتراپی و پوست</p>
                  </div>
                  {selectedPatient && (
                    <div className="pt-2 border-t border-purple-100 text-[10px] text-slate-600">
                      شماره پرونده: <span className="font-bold text-purple-900">{getPatientFileNumberDisplay(selectedPatient, 'aesthetic')}</span>
                    </div>
                  )}
                </div>

                {/* Clinic 2: Dental */}
                <div
                  onClick={() => setSelectedPractice('dental')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    selectedPractice === 'dental'
                      ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-teal-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    {selectedPractice === 'dental' && (
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">مطب دندانپزشکی</h4>
                    <p className="text-[11px] text-teal-800 font-bold mt-0.5">دکتر مجتبی آخرتی</p>
                    <p className="text-[10px] text-slate-500 mt-1">کامپوزیت، عصب‌کشی، جرمگیری و درمان دندان</p>
                  </div>
                  {selectedPatient && (
                    <div className="pt-2 border-t border-teal-100 text-[10px] text-slate-600">
                      شماره پرونده: <span className="font-bold text-teal-900">{getPatientFileNumberDisplay(selectedPatient, 'dental')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Suggested Service & Deposit Amount */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  خدمت پیشنهادی آینده (اختیاری):
                </label>
                <p className="text-[11px] text-slate-500 mb-2 font-medium">
                  خدمت مورد نظر برای مراجعه بعدی بیمار را انتخاب کنید یا بدون خدمت ادامه دهید.
                </p>
                <SearchableServiceSelect
                  services={clinicServices}
                  selectedServiceId={selectedServiceId}
                  onChange={handleServiceSelect}
                  placeholder="انتخاب خدمت پیشنهادی..."
                />
              </div>

              {selectedService && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{selectedService.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">تعرفه مصوب کلینیک</p>
                  </div>
                  <div className="text-left font-black text-indigo-600 text-xs">
                    {formatCurrency(selectedService.price)}
                  </div>
                </div>
              )}

              {/* Deposit Amount Input */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1">
                  مبلغ بیعانه پرداختی (تومان): <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2 font-medium">
                  مبلغ بیعانه توسط منشی تعیین می‌شود و لزوماً برابر با تعرفه خدمت نیست.
                </p>
                <MoneyInput
                  value={depositAmount}
                  onChange={(val) => setDepositAmount(val)}
                  placeholder="مبلغ بیعانه به تومان..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: Appointment */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  وضعیت نوبت مرتبط با بیعانه:
                </label>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">
                  می‌توانید نوبت موجود بیمار را انتخاب کرده، نوبت جدید ثبت کنید یا بیعانه را «در انتظار تعیین نوبت» نگه دارید.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAppointmentMode('pending_schedule')}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                    appointmentMode === 'pending_schedule'
                      ? 'bg-white text-indigo-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  در انتظار تعیین نوبت
                </button>

                <button
                  type="button"
                  onClick={() => setAppointmentMode('existing')}
                  disabled={patientExistingAppointments.length === 0}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                    appointmentMode === 'existing'
                      ? 'bg-white text-indigo-700 shadow-xs font-black'
                      : patientExistingAppointments.length === 0
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  نوبت‌های موجود ({toFarsiDigits(patientExistingAppointments.length)})
                </button>

                <button
                  type="button"
                  onClick={() => setAppointmentMode('new')}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                    appointmentMode === 'new'
                      ? 'bg-white text-indigo-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  رزرو نوبت جدید
                </button>
              </div>

              {/* Mode 1: Pending Schedule */}
              {appointmentMode === 'pending_schedule' && (
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>وضعیت: در انتظار تعیین نوبت</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    بیعانه بدون نوبت قطعی ثبت می‌شود و پس از هماهنگی منشی با بیمار، می‌توان در آینده از پرونده بیعانه نوبت را تعیین نمود.
                  </p>
                </div>
              )}

              {/* Mode 2: Existing Appointment */}
              {appointmentMode === 'existing' && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">انتخاب یکی از نوبت‌های فعال بیمار:</label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {patientExistingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => setSelectedAppointmentId(apt.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          selectedAppointmentId === apt.id
                            ? 'border-indigo-600 bg-indigo-50 font-bold'
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            تاریخ: {toFarsiDigits(apt.date)} • ساعت: {toFarsiDigits(apt.timeSlot)}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            پزشک: {apt.doctorName} {apt.serviceName ? `• خدمت: ${apt.serviceName}` : ''}
                          </p>
                        </div>
                        {selectedAppointmentId === apt.id && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: New Appointment */}
              {appointmentMode === 'new' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">تاریخ نوبت:</label>
                      <JalaliDatePicker
                        value={newApptDate}
                        onChange={(d) => {
                          setNewApptDate(d);
                          checkConflict(d, newApptTimeSlot);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ساعت نوبت:</label>
                      <TimeSlotPicker
                        value={newApptTimeSlot}
                        onChange={(s) => {
                          setNewApptTimeSlot(s);
                          checkConflict(newApptDate, s);
                        }}
                        date={newApptDate}
                        doctorId={selectedPractice === 'aesthetic' ? 'doc-1' : 'doc-2'}
                        appointments={appointments}
                      />
                    </div>
                  </div>

                  {apptConflictError && (
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{apptConflictError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">توضیحات نوبت (اختیاری):</label>
                    <input
                      type="text"
                      value={newApptNotes}
                      onChange={(e) => setNewApptNotes(e.target.value)}
                      placeholder="یادداشت برای منشی یا پزشک..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Receive Deposit */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  مشخصات تراکنش دریافت وجه بیعانه:
                </label>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">
                  وجه دریافتی به عنوان دریافت واقعی در حساب مطب ثبت شده و در پرونده مالی بیمار قابل پیگیری خواهد بود.
                </p>
              </div>

              {/* Summary Recap Card */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">بیمار:</span>
                  <span className="font-bold text-slate-900">{selectedPatient?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">مطب:</span>
                  <span className="font-bold text-indigo-900">
                    {selectedPractice === 'aesthetic' ? 'مطب زیبایی (دکتر رمضانی)' : 'مطب دندانپزشکی (دکتر آخرتی)'}
                  </span>
                </div>
                {selectedService && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">خدمت پیشنهادی:</span>
                    <span className="font-bold text-slate-800">{selectedService.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">وضعیت نوبت:</span>
                  <span className="font-bold text-slate-800">
                    {appointmentMode === 'pending_schedule'
                      ? 'در انتظار تعیین نوبت'
                      : appointmentMode === 'existing'
                      ? 'اتصال به نوبت موجود'
                      : `رزرو نوبت در ${toFarsiDigits(newApptDate)} ساعت ${toFarsiDigits(newApptTimeSlot)}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-indigo-200/80 flex items-center justify-between">
                  <span className="font-bold text-indigo-900">مبلغ بیعانه:</span>
                  <span className="text-sm font-black text-emerald-600">{formatCurrency(depositAmount)}</span>
                </div>
              </div>

              {/* Payment Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ دریافت وجه:</label>
                  <JalaliDatePicker
                    value={paymentDate}
                    onChange={(d) => setPaymentDate(d)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حساب / پایانه دریافت‌کننده:</label>
                  <select
                    value={posAccount}
                    onChange={(e) => setPosAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs font-bold"
                  >
                    {getPracticePaymentAccounts(selectedPractice).map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">توضیحات اختیاری:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="توضیحات یا شرایط بیعانه..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs resize-none"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewDepositOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              انصراف
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>مرحله بعد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitDeposit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-200 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت...' : 'تأیید و ثبت بیعانه'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
