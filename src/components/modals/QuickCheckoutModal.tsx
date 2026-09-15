import React, { useState, useEffect } from 'react';
import { useClinic, PRACTICE_PAYMENT_ACCOUNTS, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate, getJalaliDateOffset } from '../../utils/persianUtils';
import { X, CalendarPlus } from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { SearchableServiceSelect } from '../common/SearchableServiceSelect';
import { MoneyInput } from '../common/MoneyInput';

export const QuickCheckoutModal: React.FC = () => {
  const {
    isQuickCheckoutOpen,
    setIsQuickCheckoutOpen,
    selectedAppointmentForCheckout,
    services,
    doctors,
    appointments,
    patients,
    recordCheckout,
    addAppointment,
    checkAppointmentConflict,
    getPracticePaymentAccounts
  } = useClinic();

  const apt = selectedAppointmentForCheckout;

  // Filter services strictly by Appointment -> Doctor -> Practice
  const currentDoctor = apt ? doctors.find(d => d.id === apt.doctorId) : undefined;
  const targetPractice = currentDoctor ? currentDoctor.practice : (apt?.practice || 'aesthetic');
  const validServices = services.filter(s => s.active !== false && s.practice === targetPractice);
  const availableAccounts = getPracticePaymentAccounts(targetPractice);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'>('pos_aesthetic');
  const [posAccount, setPosAccount] = useState<string>('');
  const [debtDueDate, setDebtDueDate] = useState<string>(getJalaliDateOffset(getTodayJalaliDate(), 10));
  const [notes, setNotes] = useState<string>('');

  // Follow-up Visit States
  const [isFollowUpVisitEnabled, setIsFollowUpVisitEnabled] = useState<boolean>(false);
  const [nextVisitDate, setNextVisitDate] = useState<string>(getJalaliDateOffset(getTodayJalaliDate(), 14));
  const [nextVisitTimeSlot, setNextVisitTimeSlot] = useState<string>('۱۰:۰۰');
  const [nextVisitDoctorId, setNextVisitDoctorId] = useState<string>('');
  const [nextVisitServiceId, setNextVisitServiceId] = useState<string>('');
  const [nextVisitError, setNextVisitError] = useState<string>('');

  useEffect(() => {
    if (isQuickCheckoutOpen && apt) {
      const doc = doctors.find(d => d.id === apt.doctorId);
      const scope = doc ? doc.practice : apt.practice;
      const valid = services.filter(s => s.active !== false && s.practice === scope);

      const matchedService = valid.find(s => s.id === apt.serviceId);
      if (matchedService) {
        setSelectedServiceId(matchedService.id);
        setTotalCost(matchedService.price);
        setPaidAmount(matchedService.price);
        const termDays = matchedService.defaultPaymentTermDays && matchedService.defaultPaymentTermDays > 0 ? matchedService.defaultPaymentTermDays : 10;
        setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), termDays));
      } else {
        // Clear invalid or unset service
        setSelectedServiceId('');
        setTotalCost(0);
        setPaidAmount(0);
        setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), 10));
      }
      setDiscount(0);
      setPaymentMethod(apt.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
      const accounts = PRACTICE_PAYMENT_ACCOUNTS[scope] || PRACTICE_PAYMENT_ACCOUNTS.aesthetic;
      setPosAccount(accounts[0] || 'کارتخوان');

      // Always reset temporary follow-up / next visit states on open/appointment change
      setIsFollowUpVisitEnabled(false);
      setNextVisitDate(getJalaliDateOffset(getTodayJalaliDate(), 14));
      setNextVisitTimeSlot('۱۰:۰۰');
      setNextVisitDoctorId(apt.doctorId);
      setNextVisitServiceId('');
      setNextVisitError('');
    }
  }, [isQuickCheckoutOpen, apt, services, doctors]);

  if (!isQuickCheckoutOpen || !apt) return null;

  const handleServiceChange = (srvId: string) => {
    setSelectedServiceId(srvId);
    const srv = validServices.find(s => s.id === srvId);
    if (srv) {
      setTotalCost(srv.price);
      setPaidAmount(srv.price);
      setDiscount(0);
      const termDays = srv.defaultPaymentTermDays && srv.defaultPaymentTermDays > 0 ? srv.defaultPaymentTermDays : 10;
      setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), termDays));
    } else {
      setTotalCost(0);
      setPaidAmount(0);
      setDiscount(0);
    }
  };

  const handleNextVisitChange = (newDate: string, newSlot: string, srvId?: string) => {
    setNextVisitDate(newDate);
    setNextVisitTimeSlot(newSlot);
    if (srvId !== undefined) {
      setNextVisitServiceId(srvId);
    }

    if (isFollowUpVisitEnabled) {
      const isConflict = checkAppointmentConflict(newDate, newSlot, apt?.doctorId || nextVisitDoctorId);
      if (isConflict) {
        setNextVisitError(`⚠️ زمان ${newSlot} در تاریخ ${newDate} برای پزشک معالج پر است.`);
      } else {
        setNextVisitError('');
      }
    }
  };

  const netCost = Math.max(0, totalCost - discount);
  const remainingDebt = Math.max(0, netCost - paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const srv = validServices.find(s => s.id === selectedServiceId);
    if (!srv) return;

    // Generate Current Payment Timestamp e.g. "۱۴:۳۵"
    const now = new Date();
    const currentTimestamp = toFarsiDigits(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));

    // Record checkout transaction
    recordCheckout({
      patientId: apt.patientId,
      patientName: apt.patientName,
      fileNumber: apt.fileNumber,
      appointmentId: apt.id,
      practice: apt.practice,
      date: getTodayJalaliDate(),
      timestamp: currentTimestamp,
      serviceName: srv.name,
      totalCost,
      discount,
      netCost,
      paidAmount,
      remainingDebt,
      paymentMethod,
      posAccount,
      debtDueDate: remainingDebt > 0 ? debtDueDate : undefined,
      notes
    });

    // Handle Follow-up Next Visit Appointment creation if requested
    if (isFollowUpVisitEnabled && !nextVisitError) {
      const docObj = doctors.find(d => d.id === apt.doctorId) || currentDoctor || doctors[0];
      const nextSrv = validServices.find(s => s.id === nextVisitServiceId);
      addAppointment({
        patientId: apt.patientId,
        patientName: apt.patientName,
        patientMobile: apt.patientMobile,
        fileNumber: apt.fileNumber,
        doctorId: docObj.id,
        doctorName: docObj.name,
        practice: docObj.practice,
        date: nextVisitDate,
        timeSlot: nextVisitTimeSlot,
        duration: nextSrv ? nextSrv.duration : 30,
        status: 'pending',
        serviceId: nextSrv?.id,
        serviceName: nextSrv?.name,
        notes: `نوبت ویزیت مجدد رزرو شده در زمان تسویه (قبلی: ${apt.date})`,
        cabinetNumber: docObj.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'
      });
    }

    setIsQuickCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">

        {/* Header (Fixed) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800">ثبت خدمت، صورتحساب و تسویه فوری ویزیت</h3>
            <p className="text-xs text-slate-500 font-medium">بیمار: {apt.patientName} ({(() => { const p = patients.find(p => p.id === apt.patientId); return p ? getPatientFileNumberDisplay(p, apt.practice) : toFarsiDigits(apt.fileNumber); })()})</p>
          </div>
          <button onClick={() => setIsQuickCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">

          {/* Scrollable Form Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* Service Searchable Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">انتخاب خدمت ارائه شده:</label>
              <SearchableServiceSelect
                services={validServices}
                selectedServiceId={selectedServiceId}
                onChange={handleServiceChange}
                placeholder="جستجوی خدمت..."
              />
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[11px]">مبلغ کل (تومان):</label>
                <MoneyInput
                  value={totalCost}
                  onChange={(val) => setTotalCost(val)}
                  unit=""
                  className="text-xs py-1.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[11px]">تخفیف (تومان):</label>
                <MoneyInput
                  value={discount}
                  onChange={(val) => setDiscount(val)}
                  unit=""
                  className="text-xs py-1.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-indigo-700 mb-1 text-[11px]">قابل پرداخت نهایی:</label>
                <div className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-indigo-900 font-extrabold text-xs text-left dir-ltr">
                  {formatCurrency(netCost)}
                </div>
              </div>
            </div>

            {/* Payment Method & POS Dropdown */}
            <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">روش و حساب کارتخوان دریافتی:</label>
                <select
                  value={posAccount}
                  onChange={(e) => setPosAccount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {availableAccounts.map(accountName => (
                    <option key={accountName} value={accountName}>{accountName}</option>
                  ))}
                </select>
              </div>

              {/* Paid Amount vs Remaining Debt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1 text-[11px]">مبلغ دریافتی فعلی (تومان):</label>
                  <MoneyInput
                    value={paidAmount}
                    onChange={(val) => setPaidAmount(val)}
                    unit=""
                    className="text-xs py-1.5 font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-800 mb-1 text-[11px]">مانده بدهی این خدمت:</label>
                  <div className={`w-full border rounded-xl px-3 py-1.5 font-extrabold text-xs text-left dir-ltr ${remainingDebt > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {formatCurrency(remainingDebt)}
                  </div>
                </div>
              </div>

              {/* Conditional Debt Due Date Picker */}
              {remainingDebt > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <label className="block font-bold text-amber-800 text-[11px]">تاریخ سررسید / پیگیری بدهی باقیمانده:</label>
                  <JalaliDatePicker
                    value={debtDueDate}
                    onChange={(date) => setDebtDueDate(date)}
                  />
                </div>
              )}
            </div>

            {/* Notes Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">یادداشت ثبت خدمت (اختیاری):</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلاً: تخفیف با موافقت پزشک..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Follow-up / Next Visit Checkbox Section */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900 text-xs">
                <input
                  type="checkbox"
                  checked={isFollowUpVisitEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFollowUpVisitEnabled(checked);
                    if (checked) {
                      setNextVisitDoctorId(apt.doctorId);
                      handleNextVisitChange(nextVisitDate, nextVisitTimeSlot);
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <CalendarPlus className="w-4 h-4 text-indigo-600" />
                  <span>رزرو همزمان نوبت ویزیت مجدد / چکاپ بعدی بیمار</span>
                </span>
              </label>

              {isFollowUpVisitEnabled && (
                <div className="space-y-3 pt-2 border-t border-indigo-100/80 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاریخ ویزیت مجدد:</label>
                      <JalaliDatePicker
                        value={nextVisitDate}
                        minDate={getTodayJalaliDate()}
                        onChange={(d) => handleNextVisitChange(d || getTodayJalaliDate(), nextVisitTimeSlot)}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">پزشک معالج:</label>
                      <select
                        value={nextVisitDoctorId || apt.doctorId}
                        onChange={(e) => {
                          const docId = e.target.value;
                          setNextVisitDoctorId(docId);
                          handleNextVisitChange(nextVisitDate, nextVisitTimeSlot);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        {doctors.filter(d => d.practice === targetPractice).map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <TimeSlotPicker
                      value={nextVisitTimeSlot}
                      onChange={(slot) => handleNextVisitChange(nextVisitDate, slot)}
                      date={nextVisitDate}
                      doctorId={nextVisitDoctorId || apt.doctorId}
                      appointments={appointments}
                      label="ساعت حضور ویزیت مجدد:"
                    />
                  </div>

                  {nextVisitError && (
                    <p className="text-[11px] font-bold text-rose-600">{nextVisitError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer (Fixed) */}
          <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => setIsQuickCheckoutOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!selectedServiceId || (isFollowUpVisitEnabled && !!nextVisitError)}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${!selectedServiceId || (isFollowUpVisitEnabled && nextVisitError)
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
            >
              ثبت ویزیت و صدور صورتحساب
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

