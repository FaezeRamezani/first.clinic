import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate, getJalaliDateOffset } from '../../utils/persianUtils';
import { X, AlertCircle, CheckCircle2, CalendarPlus } from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { SearchableServiceSelect } from '../common/SearchableServiceSelect';

export const QuickCheckoutModal: React.FC = () => {
  const {
    isQuickCheckoutOpen,
    setIsQuickCheckoutOpen,
    selectedAppointmentForCheckout,
    services,
    doctors,
    appointments,
    recordCheckout,
    addAppointment,
    checkAppointmentConflict
  } = useClinic();

  const apt = selectedAppointmentForCheckout;

  // Filter services strictly by Appointment -> Doctor -> Practice
  const currentDoctor = apt ? doctors.find(d => d.id === apt.doctorId) : undefined;
  const targetPractice = currentDoctor ? currentDoctor.practice : (apt?.practice || 'aesthetic');
  const validServices = services.filter(s => s.active !== false && s.practice === targetPractice);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'>('pos_aesthetic');
  const [posAccount, setPosAccount] = useState<string>('کارتخوان بانک سامان (مطب زیبایی)');
  const [debtDueDate, setDebtDueDate] = useState<string>(getJalaliDateOffset(getTodayJalaliDate(), 10));
  const [notes] = useState<string>('');

  // Follow-up Visit States
  const [isFollowUpVisitEnabled, setIsFollowUpVisitEnabled] = useState<boolean>(false);
  const [nextVisitDate, setNextVisitDate] = useState<string>(getJalaliDateOffset(getTodayJalaliDate(), 14));
  const [nextVisitTimeSlot, setNextVisitTimeSlot] = useState<string>('۱۰:۰۰');
  const [nextVisitDoctorId, setNextVisitDoctorId] = useState<string>('');
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
      } else {
        // Clear invalid or unset service
        setSelectedServiceId('');
        setTotalCost(0);
        setPaidAmount(0);
      }
      setDiscount(0);
      setPaymentMethod(apt.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
      setPosAccount(apt.practice === 'aesthetic' ? 'کارتخوان بانک سامان (مطب زیبایی)' : 'کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
      setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), 10));

      // Always reset temporary follow-up / next visit states on open/appointment change
      setIsFollowUpVisitEnabled(false);
      setNextVisitDate(getJalaliDateOffset(getTodayJalaliDate(), 14));
      setNextVisitTimeSlot('۱۰:۰۰');
      setNextVisitDoctorId(apt.doctorId);
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
    } else {
      setTotalCost(0);
      setPaidAmount(0);
      setDiscount(0);
    }
  };

  const handleNextVisitChange = (newDate: string, newSlot: string, newDocId: string) => {
    setNextVisitDate(newDate);
    setNextVisitTimeSlot(newSlot);
    setNextVisitDoctorId(newDocId);

    if (isFollowUpVisitEnabled) {
      const isConflict = checkAppointmentConflict(newDate, newSlot, newDocId);
      if (isConflict) {
        setNextVisitError(`⚠️ زمان ${newSlot} در تاریخ ${newDate} برای پزشک انتخابی پر است.`);
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
      const docObj = doctors.find(d => d.id === nextVisitDoctorId) || doctors[0];
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
        duration: 30,
        status: 'pending',
        notes: `نوبت ویزیت مجدد رزرو شده در زمان تسویه (قبلی: ${apt.date})`,
        cabinetNumber: docObj.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'
      });
    }

    setIsQuickCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">ثبت خدمت، صورتحساب و تسویه فوری ویزیت</h3>
            <p className="text-xs text-slate-500 font-medium">بیمار: {apt.patientName} ({toFarsiDigits(apt.fileNumber)})</p>
          </div>
          <button onClick={() => setIsQuickCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

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
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[11px]">مبلغ کل (تومان):</label>
              <input
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[11px]">تخفیف (تومان):</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[11px]">مبلغ نهایی قابل پرداخت:</label>
              <div className="py-2 px-2 text-xs font-black text-indigo-700 bg-indigo-50/70 rounded-xl border border-indigo-200">
                {formatCurrency(netCost)}
              </div>
            </div>
          </div>

          {/* Payment Method & Paid Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">روش و حساب مقصد:</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const m = e.target.value as any;
                  setPaymentMethod(m);
                  if (m === 'pos_aesthetic') setPosAccount('کارتخوان بانک سامان (مطب زیبایی)');
                  else if (m === 'pos_dental') setPosAccount('کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
                  else if (m === 'card_transfer') setPosAccount('حساب کارت به کارت (بانک ملی)');
                  else setPosAccount('صندوق نقدی مطب');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="pos_aesthetic">کارتخوان زیبایی (بانک سامان)</option>
                <option value="pos_dental">کارتخوان دندانپزشکی (پاسارگاد)</option>
                <option value="card_transfer">کارت به کارت (بانک ملی)</option>
                <option value="cash">دریافت نقدی</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مبلغ پرداختی دریافتی (تومان):</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 outline-none"
              />
            </div>
          </div>

          {/* Remaining Debt Warning & Jalali Date Picker */}
          {remainingDebt > 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>باقیمانده بدهی / قسط جدید:</span>
                </span>
                <span className="text-sm font-black">{formatCurrency(remainingDebt)}</span>
              </div>

              <div>
                <JalaliDatePicker
                  label="تعیین تاریخ سررسید پرداخت قسط:"
                  value={debtDueDate}
                  onChange={(d) => setDebtDueDate(d)}
                />
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تسویه کامل انجام می‌شود. (بدون بدهی)</span>
            </div>
          )}

          {/* Follow-up Visit Checkbox & Date Picker Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-indigo-900">
              <input
                type="checkbox"
                checked={isFollowUpVisitEnabled}
                onChange={(e) => {
                  setIsFollowUpVisitEnabled(e.target.checked);
                  if (e.target.checked) handleNextVisitChange(nextVisitDate, nextVisitTimeSlot, nextVisitDoctorId);
                }}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <CalendarPlus className="w-4 h-4 text-indigo-600" />
              <span>تعیین ویزیت مجدد (رزرو نوبت بعدی درمان برای بیمار)</span>
            </label>

            {isFollowUpVisitEnabled && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="space-y-3">
                  <JalaliDatePicker
                    label="تاریخ ویزیت بعدی:"
                    value={nextVisitDate}
                    minDate={getTodayJalaliDate()}
                    onChange={(d) => handleNextVisitChange(d || getTodayJalaliDate(), nextVisitTimeSlot, nextVisitDoctorId)}
                  />

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">پزشک نوبت بعدی:</label>
                    <select
                      value={nextVisitDoctorId}
                      onChange={(e) => handleNextVisitChange(nextVisitDate, nextVisitTimeSlot, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                      ))}
                    </select>
                  </div>

                  <TimeSlotPicker
                    label="ساعت ویزیت بعدی:"
                    value={nextVisitTimeSlot}
                    onChange={(slot) => handleNextVisitChange(nextVisitDate, slot, nextVisitDoctorId)}
                    date={nextVisitDate}
                    doctorId={nextVisitDoctorId}
                    appointments={appointments}
                  />
                </div>

                {nextVisitError && (
                  <p className="text-[11px] font-bold text-rose-600">{nextVisitError}</p>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickCheckoutOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!selectedServiceId || (isFollowUpVisitEnabled && !!nextVisitError)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${!selectedServiceId || (isFollowUpVisitEnabled && nextVisitError)
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

