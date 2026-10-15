import React, { useState, useEffect } from 'react';
import { useClinic, PRACTICE_PAYMENT_ACCOUNTS, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate, getJalaliDateOffset } from '../../utils/persianUtils';
import { X, CalendarPlus, CreditCard, Trash2 } from 'lucide-react';
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
    deposits,
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

  interface SelectedServiceEntry {
    id: string;
    serviceId: string;
    name: string;
    cost: number;
    duration?: number;
    defaultPaymentTermDays?: number;
  }

  const [selectedServices, setSelectedServices] = useState<SelectedServiceEntry[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer'>('pos_aesthetic');
  const [posAccount, setPosAccount] = useState<string>('');
  const [debtDueDate, setDebtDueDate] = useState<string>(getJalaliDateOffset(getTodayJalaliDate(), 10));
  const [notes, setNotes] = useState<string>('');
  const [applyDeposit, setApplyDeposit] = useState<boolean>(false);

  // Active deposit lookup
  const activeDeposit = deposits.find(
    d => d.patientId === apt?.patientId &&
         d.practice === targetPractice &&
         (d.status === 'active' || d.status === 'partially_allocated' || d.status === 'partially_applied') &&
         d.remainingAmount > 0
  );

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
        setSelectedServices([{
          id: `srv-${matchedService.id}-${Date.now()}`,
          serviceId: matchedService.id,
          name: matchedService.name,
          cost: 0,
          duration: matchedService.duration,
          defaultPaymentTermDays: matchedService.defaultPaymentTermDays
        }]);
        const termDays = matchedService.defaultPaymentTermDays && matchedService.defaultPaymentTermDays > 0 ? matchedService.defaultPaymentTermDays : 10;
        setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), termDays));
      } else {
        setSelectedServices([]);
        setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), 10));
      }

      setPaidAmount(0);
      setPaymentMethod(apt.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
      const accounts = PRACTICE_PAYMENT_ACCOUNTS[scope] || PRACTICE_PAYMENT_ACCOUNTS.aesthetic;
      setPosAccount(accounts[0] || 'کارتخوان');

      // Check for active deposit
      const foundDeposit = deposits.find(
        d => d.patientId === apt.patientId &&
             d.practice === scope &&
             (d.status === 'active' || d.status === 'partially_allocated' || d.status === 'partially_applied') &&
             d.remainingAmount > 0
      );
      if (foundDeposit) {
        setApplyDeposit(true);
      } else {
        setApplyDeposit(false);
      }

      // Always reset temporary follow-up / next visit states on open/appointment change
      setIsFollowUpVisitEnabled(false);
      setNextVisitDate(getJalaliDateOffset(getTodayJalaliDate(), 14));
      setNextVisitTimeSlot('۱۰:۰۰');
      setNextVisitDoctorId(apt.doctorId);
      setNextVisitServiceId('');
      setNextVisitError('');
    }
  }, [isQuickCheckoutOpen, apt, services, doctors, deposits]);

  if (!isQuickCheckoutOpen || !apt) return null;

  const handleAddService = (srvId: string) => {
    if (!srvId) return;
    const srv = validServices.find(s => s.id === srvId);
    if (!srv) return;
    if (selectedServices.some(s => s.serviceId === srvId)) return;

    setSelectedServices(prev => [
      ...prev,
      {
        id: `srv-${srv.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        serviceId: srv.id,
        name: srv.name,
        cost: 0,
        duration: srv.duration,
        defaultPaymentTermDays: srv.defaultPaymentTermDays
      }
    ]);

    if (srv.defaultPaymentTermDays && srv.defaultPaymentTermDays > 0) {
      setDebtDueDate(getJalaliDateOffset(getTodayJalaliDate(), srv.defaultPaymentTermDays));
    }
  };

  const handleUpdateServiceCost = (itemId: string, newCost: number) => {
    setSelectedServices(prev => {
      const updated = prev.map(s => s.id === itemId ? { ...s, cost: newCost } : s);
      const newTotal = updated.reduce((sum, s) => sum + s.cost, 0);
      const deduction = (applyDeposit && activeDeposit) ? Math.min(activeDeposit.remainingAmount, newTotal) : 0;
      setPaidAmount(Math.max(0, newTotal - deduction));
      return updated;
    });
  };

  const handleRemoveService = (itemId: string) => {
    setSelectedServices(prev => {
      const updated = prev.filter(s => s.id !== itemId);
      const newTotal = updated.reduce((sum, s) => sum + s.cost, 0);
      const deduction = (applyDeposit && activeDeposit) ? Math.min(activeDeposit.remainingAmount, newTotal) : 0;
      setPaidAmount(Math.max(0, newTotal - deduction));
      return updated;
    });
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
        setNextVisitError('⚠️ ظرفیت این بازه زمانی در این مطب تکمیل شده است.');
      } else {
        setNextVisitError('');
      }
    }
  };

  const totalCost = selectedServices.reduce((sum, s) => sum + s.cost, 0);
  const netCost = totalCost;
  const depositDeduction = (applyDeposit && activeDeposit) ? Math.min(activeDeposit.remainingAmount, totalCost) : 0;
  const payableAfterDeposit = Math.max(0, totalCost - depositDeduction);
  const remainingDebt = Math.max(0, payableAfterDeposit - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) return;

    // Generate Current Payment Timestamp e.g. "۱۴:۳۵"
    const now = new Date();
    const currentTimestamp = toFarsiDigits(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));

    // Record checkout transaction for all selected services
    await recordCheckout({
      patientId: apt.patientId,
      patientName: apt.patientName,
      fileNumber: apt.fileNumber,
      appointmentId: apt.id,
      practice: apt.practice,
      date: getTodayJalaliDate(),
      timestamp: currentTimestamp,
      services: selectedServices.map(s => ({
        serviceId: s.serviceId,
        serviceName: s.name,
        cost: s.cost,
        defaultPaymentTermDays: s.defaultPaymentTermDays
      })),
      totalCost,
      paidAmount,
      remainingDebt,
      paymentMethod,
      posAccount,
      debtDueDate: remainingDebt > 0 ? debtDueDate : undefined,
      notes,
      depositId: (applyDeposit && activeDeposit) ? activeDeposit.id : undefined
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
            {/* Service Searchable Selector & Add */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                انتخاب و افزودن خدمات ارائه شده:
              </label>
              <SearchableServiceSelect
                services={validServices.filter(s => !selectedServices.some(sel => sel.serviceId === s.id))}
                selectedServiceId=""
                onChange={handleAddService}
                placeholder="جستجو و انتخاب خدمت برای افزودن به لیست..."
              />
            </div>

            {/* Selected Services List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs">
                  فهرست خدمات انتخاب‌شده ({toFarsiDigits(selectedServices.length)} خدمت):
                </span>
                {selectedServices.length > 0 && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    مبلغ هزینه هر خدمت را مشخص کنید
                  </span>
                )}
              </div>

              {selectedServices.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-2xl text-center space-y-1">
                  <p className="text-xs font-bold text-amber-800">
                    هنوز خدمتی انتخاب نشده است.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    لطفاً از کادر بالا حداقل یک خدمت را جستجو و اضافه کنید.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                  {selectedServices.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                    >
                      {/* Service Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {toFarsiDigits(index + 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
                          {item.duration && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              مدت: {toFarsiDigits(item.duration)} دقیقه
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cost Input & Remove Button */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 focus-within:border-indigo-500">
                          <span className="text-[10px] font-bold text-slate-500">مبلغ:</span>
                          <MoneyInput
                            value={item.cost}
                            onChange={(val) => handleUpdateServiceCost(item.id, val)}
                            unit="تومان"
                            placeholder="۰"
                            className="text-xs py-0.5 w-28 font-bold text-slate-900 border-none bg-transparent outline-none p-0"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveService(item.id)}
                          title="حذف این خدمت"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Cost Summary Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">مجموع هزینه کل خدمات:</span>
                <span className="font-black text-sm text-slate-900 dir-ltr text-left">
                  {formatCurrency(totalCost)}
                </span>
              </div>

              {applyDeposit && depositDeduction > 0 && (
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 bg-indigo-50/80 p-2 rounded-xl border border-indigo-200">
                  <span>مانده قابل تسویه پس از کسر بیعانه:</span>
                  <span className="text-xs font-black dir-ltr text-left">{formatCurrency(payableAfterDeposit)}</span>
                </div>
              )}
            </div>

            {/* Active Deposit Notification Banner */}
            {activeDeposit && (
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        بیعانه فعال موجود: {formatCurrency(activeDeposit.remainingAmount)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        پرداخت‌شده در تاریخ {toFarsiDigits(activeDeposit.paymentDate)} ({activeDeposit.practice === 'aesthetic' ? 'مطب زیبایی' : 'مطب دندانپزشکی'})
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-indigo-200 hover:border-indigo-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={applyDeposit}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setApplyDeposit(checked);
                        if (checked) {
                          const deduction = Math.min(activeDeposit.remainingAmount, netCost);
                          const remainingToPay = Math.max(0, netCost - deduction);
                          setPaidAmount(remainingToPay);
                        } else {
                          setPaidAmount(netCost);
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-indigo-900 text-xs">اعمال بیعانه</span>
                  </label>
                </div>
                {applyDeposit && (
                  <div className="text-[11px] font-semibold text-indigo-700 bg-white/70 p-2 rounded-xl flex items-center justify-between">
                    <span>کسر از صورتحساب: {formatCurrency(depositDeduction)}</span>
                    <span>مانده قابل تسویه: {formatCurrency(payableAfterDeposit)}</span>
                  </div>
                )}
              </div>
            )}

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
                  <label className="block font-bold text-rose-800 mb-1 text-[11px]">مانده بدهی این مراجعه:</label>
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
                placeholder="مثلاً: هماهنگی با پزشک معالج..."
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
              disabled={selectedServices.length === 0 || (isFollowUpVisitEnabled && !!nextVisitError)}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${selectedServices.length === 0 || (isFollowUpVisitEnabled && nextVisitError)
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

