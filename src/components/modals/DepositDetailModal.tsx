import React, { useState, useEffect } from 'react';
import {
  useClinic,
  getPatientFileNumberDisplay
} from '../../context/ClinicContext';
import {
  formatCurrency,
  toFarsiDigits,
  getTodayJalaliDate
} from '../../utils/persianUtils';
import {
  X,
  Sparkles,
  Stethoscope,
  CreditCard,
  Clock,
  History,
  Edit2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  CalendarPlus,
  ExternalLink
} from 'lucide-react';
import { MoneyInput } from '../common/MoneyInput';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { SearchableServiceSelect } from '../common/SearchableServiceSelect';

export const DepositDetailModal: React.FC = () => {
  const {
    selectedDepositForDetail,
    setSelectedDepositForDetail,
    patients,
    services,
    appointments,
    transactions,
    doctors,
    updateDeposit,
    adjustDepositAmount,
    refundDeposit,
    applyDepositToService,
    getPracticePaymentAccounts,
    checkAppointmentConflict,
    openPatientProfile
  } = useClinic();

  const dep = selectedDepositForDetail;

  // Active Sub-modal/Action Panel
  const [activeAction, setActiveAction] = useState<
    'none' | 'edit_info' | 'adjust_amount' | 'schedule_appt' | 'refund' | 'apply'
  >('none');

  // Sub-action States
  // 1. Edit Info
  const [editServiceId, setEditServiceId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // 2. Adjust Amount
  const [adjustNewAmount, setAdjustNewAmount] = useState<number>(0);
  const [adjustPosAccount, setAdjustPosAccount] = useState<string>('');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // 3. Schedule / Reschedule Appointment
  const [apptDate, setApptDate] = useState<string>(getTodayJalaliDate());
  const [apptTimeSlot, setApptTimeSlot] = useState<string>('۱۰:۰۰');
  const [apptConflictError, setApptConflictError] = useState<string>('');

  // 4. Refund
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundPosAccount, setRefundPosAccount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');

  // 5. Apply to Service/Obligation
  const [selectedObligationId, setSelectedObligationId] = useState<string>('');
  const [applyAmount, setApplyAmount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  // Initialize values when deposit changes or action changes
  useEffect(() => {
    if (dep) {
      setEditServiceId(dep.serviceId || '');
      setEditNotes(dep.notes || '');
      setAdjustNewAmount(dep.initialAmount);
      const accounts = getPracticePaymentAccounts(dep.practice);
      setAdjustPosAccount(accounts[0] || 'کارتخوان');
      setRefundAmount(dep.remainingAmount);
      setRefundPosAccount(accounts[0] || 'کارتخوان');
      setRefundReason('');
      setApptDate(dep.appointmentDate || getTodayJalaliDate());
      setApptTimeSlot(dep.appointmentTimeSlot || '۱۰:۰۰');
      setApptConflictError('');
      setSelectedObligationId('');
      setApplyAmount(dep.remainingAmount);
      setActionError('');
      setActiveAction('none');
    }
  }, [dep]);

  if (!dep) return null;

  const patient = patients.find(p => p.id === dep.patientId);
  const isAesthetic = dep.practice === 'aesthetic';
  const clinicDoctor = doctors.find(d => d.practice === dep.practice);
  const validClinicServices = services.filter(s => s.practice === dep.practice && s.active !== false);

  // Available obligations for patient in this practice that have remaining debt > 0
  const candidateObligations = transactions.filter(t =>
    t.patientId === dep.patientId &&
    t.practice === dep.practice &&
    t.trxType !== 'payment' &&
    ((t.currentRemainingDebt !== undefined ? t.currentRemainingDebt : t.remainingDebt) > 0)
  );

  // Linked payment receipts for this deposit
  const linkedReceipts = transactions.filter(t =>
    t.depositId === dep.id || (dep.paymentReceiptId && t.id === dep.paymentReceiptId)
  );

  // Status Badge Label & Color
  const renderStatusBadge = () => {
    switch (dep.status) {
      case 'active':
        return (
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>فعال و تخصیص‌نیافته</span>
          </span>
        );
      case 'applied':
        return (
          <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>اعمال‌شده روی خدمت</span>
          </span>
        );
      case 'partially_applied':
        return (
          <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>اعمال جزئی</span>
          </span>
        );
      case 'refunded':
        return (
          <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>مستردشده</span>
          </span>
        );
      case 'partially_refunded':
        return (
          <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>استرداد جزئی</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Appointment Status Badge
  const renderApptStatus = () => {
    if (!dep.appointmentDate) {
      return (
        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
          تعیین نشده (در انتظار)
        </span>
      );
    }
    const apt = appointments.find(a => a.id === dep.appointmentId);
    const status = apt?.status || dep.appointmentStatus || 'pending';
    if (status === 'completed') {
      return <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold">انجام شده</span>;
    }
    if (status === 'canceled') {
      return <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 text-[11px] font-bold">لغوشده (بیعانه محفوظ است)</span>;
    }
    if (status === 'rescheduled') {
      return <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 text-[11px] font-bold">جابجا شده</span>;
    }
    return <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold">در انتظار مراجعه</span>;
  };

  // Conflict Check for Scheduling
  const handleCheckConflict = (d: string, s: string) => {
    if (!clinicDoctor) return;
    const conflict = checkAppointmentConflict(d, s, clinicDoctor.id, dep.appointmentId);
    if (conflict) {
      setApptConflictError(`این زمان (${s}) در تاریخ ${d} برای پزشک رزرو است.`);
    } else {
      setApptConflictError('');
    }
  };

  // Action Submissions
  const handleSaveInfo = async () => {
    setIsSubmitting(true);
    setActionError('');
    try {
      await updateDeposit(dep.id, {
        serviceId: editServiceId || null,
        notes: editNotes || null
      });
      setActiveAction('none');
    } catch (err: any) {
      setActionError(err.message || 'خطا در ویرایش اطلاعات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAdjustAmount = async () => {
    if (adjustNewAmount < 0) {
      setActionError('مبلغ جدید نمی‌تواند منفی باشد.');
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    try {
      await adjustDepositAmount(dep.id, {
        newAmount: adjustNewAmount,
        posAccount: adjustPosAccount,
        notes: adjustNotes || undefined
      });
      setActiveAction('none');
    } catch (err: any) {
      setActionError(err.message || 'خطا در اصلاح مبلغ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAppt = async () => {
    if (apptConflictError) {
      setActionError(apptConflictError);
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    try {
      await updateDeposit(dep.id, {
        newAppointment: {
          date: apptDate,
          timeSlot: apptTimeSlot,
          duration: 30,
          cabinetNumber: isAesthetic ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱',
          notes: `تعیین نوبت بیعانه (${dep.id})`
        }
      });
      setActiveAction('none');
    } catch (err: any) {
      setActionError(err.message || 'خطا در تعیین نوبت');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRefund = async () => {
    if (refundAmount <= 0) {
      setActionError('مبلغ استرداد باید بزرگتر از صفر باشد.');
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    try {
      await refundDeposit(dep.id, {
        refundAmount,
        paymentMethod: 'cash',
        posAccount: refundPosAccount,
        reason: refundReason || undefined
      });
      setActiveAction('none');
    } catch (err: any) {
      setActionError(err.message || 'خطا در استرداد بیعانه');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveApply = async () => {
    if (!selectedObligationId) {
      setActionError('لطفاً یک خدمت برای اعمال بیعانه انتخاب کنید.');
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    try {
      await applyDepositToService(dep.id, selectedObligationId, applyAmount);
      setActiveAction('none');
    } catch (err: any) {
      setActionError(err.message || 'خطا در اعمال بیعانه روی خدمت');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isAesthetic ? 'bg-purple-600 shadow-purple-200' : 'bg-teal-600 shadow-teal-200'
            }`}>
              {isAesthetic ? <Sparkles className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  پرونده اختصاصی بیعانه
                </h3>
                <span className="font-mono text-xs text-slate-500 font-bold">({dep.id})</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {isAesthetic ? 'مطب زیبایی (دکتر رمضانی)' : 'مطب دندانپزشکی (دکتر آخرتی)'} • تاریخ دریافت: {toFarsiDigits(dep.paymentDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {renderStatusBadge()}
            <button
              onClick={() => setSelectedDepositForDetail(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">

          {/* 1. Patient & Account Info Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">بیمار:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="font-black text-slate-900 text-sm">{dep.patientName}</p>
                {patient && (
                  <button
                    onClick={() => {
                      setSelectedDepositForDetail(null);
                      openPatientProfile(patient);
                    }}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="مشاهده پرونده اصلی بیمار"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dir-ltr text-right font-medium">{toFarsiDigits(dep.patientMobile || '')}</p>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">شماره پرونده‌ها:</span>
              <p className="font-bold text-indigo-700 mt-0.5 text-xs">
                {patient ? getPatientFileNumberDisplay(patient) : dep.fileNumber}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">ثبت شده در سامانه</p>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">مانده حساب بیمار (بدهی):</span>
              <p className={`font-bold mt-0.5 text-xs ${
                patient && patient.balance < 0 ? 'text-rose-600' : 'text-slate-700'
              }`}>
                {patient && patient.balance < 0 ? formatCurrency(Math.abs(patient.balance)) + ' بدهکار' : 'تسویه'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">بیعانه مستقل از این بدهی است</p>
            </div>
          </div>

          {/* 2. Deposit Financial Overview Card */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-indigo-900 font-semibold text-[11px]">مبلغ اولیه پرداختی:</span>
              <p className="text-base font-black text-indigo-950 mt-0.5">{formatCurrency(dep.initialAmount)}</p>
              <p className="text-[10px] text-indigo-700 font-medium">
                روش: {dep.posAccount || 'صندوق'}
              </p>
            </div>

            <div>
              <span className="text-indigo-900 font-semibold text-[11px]">مانده قابل تخصیص فعلی:</span>
              <p className="text-base font-black text-emerald-700 mt-0.5">{formatCurrency(dep.remainingAmount)}</p>
              <p className="text-[10px] text-indigo-700 font-medium">
                {dep.remainingAmount === 0 ? 'کاملاً مصرف یا مسترد شده' : 'آماده اعمال یا استرداد'}
              </p>
            </div>

            <div>
              <span className="text-indigo-900 font-semibold text-[11px]">وضعیت نوبت:</span>
              <div className="mt-1 flex items-center gap-1.5">
                {renderApptStatus()}
              </div>
              {dep.appointmentDate && (
                <p className="text-[11px] text-indigo-900 font-bold mt-1">
                  {toFarsiDigits(dep.appointmentDate)} • ساعت {toFarsiDigits(dep.appointmentTimeSlot || '')}
                </p>
              )}
            </div>
          </div>

          {/* 3. Suggested Service & Details */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold text-[11px]">خدمت پیشنهادی:</span>
              <span className="font-bold text-slate-900">
                {dep.serviceName ? dep.serviceName : 'تعیین نشده (بیعانه عمومی مراجعه)'}
              </span>
            </div>
            {dep.servicePrice && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold text-[11px]">تعرفه خدمت:</span>
                <span className="font-bold text-indigo-600">{formatCurrency(dep.servicePrice)}</span>
              </div>
            )}
            {dep.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-semibold text-[11px] block mb-0.5">توضیحات:</span>
                <p className="text-slate-700 font-medium leading-relaxed">{dep.notes}</p>
              </div>
            )}
          </div>

          {/* 4. Action Panel Sub-Views */}
          {activeAction !== 'none' && (
            <div className="p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  {activeAction === 'edit_info' && <span>اصلاح اطلاعات و خدمت پیشنهادی</span>}
                  {activeAction === 'adjust_amount' && <span>اصلاح مبلغ بیعانه با حفظ سوابق</span>}
                  {activeAction === 'schedule_appt' && <span>تعیین یا تغییر نوبت بیعانه</span>}
                  {activeAction === 'refund' && <span>استرداد وجه بیعانه به بیمار</span>}
                  {activeAction === 'apply' && <span>اعمال بیعانه روی خدمت انجام‌شده</span>}
                </h4>
                <button
                  onClick={() => setActiveAction('none')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-view: Edit Info */}
              {activeAction === 'edit_info' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">خدمت پیشنهادی:</label>
                    <SearchableServiceSelect
                      services={validClinicServices}
                      selectedServiceId={editServiceId}
                      onChange={(id) => setEditServiceId(id)}
                      placeholder="انتخاب خدمت..."
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">توضیحات بیعانه:</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-xl border border-slate-200 outline-none text-xs resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveAction('none')}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveInfo}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                    >
                      {isSubmitting ? 'در حال ثبت...' : 'ذخیره تغییرات'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-view: Adjust Amount */}
              {activeAction === 'adjust_amount' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    با افزایش یا کاهش مبلغ، تراکنش مالی مازاد یا استرداد متناظر در سوابق مالی ثبت شده و سابقه اولیه حفظ می‌گردد.
                  </p>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">مبلغ جدید بیعانه (تومان):</label>
                    <MoneyInput
                      value={adjustNewAmount}
                      onChange={(val) => setAdjustNewAmount(val)}
                    />
                  </div>
                  {adjustNewAmount !== dep.initialAmount && (
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-200 text-[11px] flex items-center justify-between font-bold">
                      <span>تفاوت مبلغ:</span>
                      <span className={adjustNewAmount > dep.initialAmount ? 'text-emerald-600' : 'text-rose-600'}>
                        {adjustNewAmount > dep.initialAmount
                          ? `دریافت مابه‌التفاوت: +${formatCurrency(adjustNewAmount - dep.initialAmount)}`
                          : `استرداد مابه‌التفاوت: -${formatCurrency(dep.initialAmount - adjustNewAmount)}`}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">حساب مالی:</label>
                    <select
                      value={adjustPosAccount}
                      onChange={(e) => setAdjustPosAccount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs font-bold"
                    >
                      {getPracticePaymentAccounts(dep.practice).map((acc) => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">توضیحات اصلاح مبلغ:</label>
                    <input
                      type="text"
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      placeholder="علت اصلاح مبلغ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveAction('none')}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveAdjustAmount}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                    >
                      {isSubmitting ? 'در حال ثبت...' : 'ثبت اصلاح مبلغ'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-view: Schedule Appt */}
              {activeAction === 'schedule_appt' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">تاریخ نوبت:</label>
                      <JalaliDatePicker
                        value={apptDate}
                        onChange={(d) => {
                          setApptDate(d);
                          handleCheckConflict(d, apptTimeSlot);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ساعت نوبت:</label>
                      <TimeSlotPicker
                        value={apptTimeSlot}
                        onChange={(s) => {
                          setApptTimeSlot(s);
                          handleCheckConflict(apptDate, s);
                        }}
                        date={apptDate}
                        doctorId={dep.practice === 'aesthetic' ? 'doc-1' : 'doc-2'}
                        appointments={appointments}
                      />
                    </div>
                  </div>
                  {apptConflictError && (
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-800 font-bold text-[11px]">
                      {apptConflictError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveAction('none')}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveAppt}
                      disabled={isSubmitting || !!apptConflictError}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'در حال ثبت...' : 'تأیید نوبت'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-view: Refund */}
              {activeAction === 'refund' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium leading-relaxed">
                    استرداد وجه تراکنش مستقل بازپرداخت ثبت می‌کند و دریافت اولیه از سوابق مالی حذف نخواهد شد.
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">مبلغ استرداد (تومان):</label>
                    <MoneyInput
                      value={refundAmount}
                      onChange={(val) => setRefundAmount(val)}
                      placeholder="مبلغ استرداد..."
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      حداکثر قابل استرداد: {formatCurrency(dep.remainingAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">حساب / صندوق بازپرداخت:</label>
                    <select
                      value={refundPosAccount}
                      onChange={(e) => setRefundPosAccount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs font-bold"
                    >
                      {getPracticePaymentAccounts(dep.practice).map((acc) => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">علت استرداد وجه:</label>
                    <input
                      type="text"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="انصراف بیمار، تغییر برنامه و..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveAction('none')}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveRefund}
                      disabled={isSubmitting || refundAmount <= 0}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'در حال ثبت...' : 'ثبت استرداد وجه'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-view: Apply to Service */}
              {activeAction === 'apply' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-medium leading-relaxed">
                    با اعمال بیعانه، مبلغ آن از هزینه خدمت کسر می‌شود و دریافت نقدی مضاعف ایجاد نخواهد شد.
                  </div>
                  {candidateObligations.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 font-semibold bg-white rounded-xl border border-slate-200">
                      هیچ خدمت تسویه‌نشده‌ای برای این بیمار در مطب انتخابی یافت نشد.
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">انتخاب خدمت انجام‌شده:</label>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto">
                        {candidateObligations.map((ob) => {
                          const rem = ob.currentRemainingDebt !== undefined ? ob.currentRemainingDebt : ob.remainingDebt;
                          return (
                            <div
                              key={ob.id}
                              onClick={() => {
                                setSelectedObligationId(ob.id);
                                setApplyAmount(Math.min(dep.remainingAmount, rem));
                              }}
                              className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                selectedObligationId === ob.id
                                  ? 'border-indigo-600 bg-indigo-50 font-bold'
                                  : 'border-slate-200 hover:border-indigo-300 bg-white'
                              }`}
                            >
                              <div>
                                <p className="font-bold text-slate-800">{ob.serviceName}</p>
                                <p className="text-[10px] text-slate-500">
                                  تاریخ: {toFarsiDigits(ob.date)} • کل: {formatCurrency(ob.netCost)}
                                </p>
                              </div>
                              <div className="text-left font-black text-rose-600">
                                بدهی: {formatCurrency(rem)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedObligationId && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">مبلغ تخصیص (تومان):</label>
                      <MoneyInput
                        value={applyAmount}
                        onChange={(val) => setApplyAmount(val)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveAction('none')}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveApply}
                      disabled={isSubmitting || !selectedObligationId || applyAmount <= 0}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'در حال ثبت...' : 'تأیید تخصیص بیعانه'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* 5. Action Buttons Toolbar */}
          {activeAction === 'none' && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-slate-600 font-bold text-[11px]">عملیات مجاز بیعانه:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Edit info */}
                <button
                  onClick={() => setActiveAction('edit_info')}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>اصلاح اطلاعات</span>
                </button>

                {/* Adjust amount */}
                {dep.status !== 'applied' && dep.status !== 'refunded' && (
                  <button
                    onClick={() => setActiveAction('adjust_amount')}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>اصلاح مبلغ</span>
                  </button>
                )}

                {/* Set or Change Appt */}
                {dep.status !== 'applied' && dep.status !== 'refunded' && (
                  <button
                    onClick={() => setActiveAction('schedule_appt')}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dep.appointmentDate ? 'تغییر نوبت' : 'تعیین نوبت'}</span>
                  </button>
                )}

                {/* Apply to service */}
                {dep.remainingAmount > 0 && dep.status !== 'applied' && dep.status !== 'refunded' && (
                  <button
                    onClick={() => setActiveAction('apply')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>اعمال روی خدمت</span>
                  </button>
                )}

                {/* Refund */}
                {dep.remainingAmount > 0 && dep.status !== 'applied' && dep.status !== 'refunded' && (
                  <button
                    onClick={() => setActiveAction('refund')}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استرداد وجه</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Related Financial Transactions Section */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>تراکنش‌های مالی مرتبط با این بیعانه:</span>
            </h4>
            <div className="border border-slate-200 rounded-2xl p-3 bg-white space-y-2 max-h-[160px] overflow-y-auto">
              {linkedReceipts.length === 0 ? (
                <p className="text-slate-400 text-[11px] text-center">تراکنش مستقیمی ثبت نشده است.</p>
              ) : (
                linkedReceipts.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{t.serviceName}</span>
                      <span className="text-[10px] text-slate-400">
                        {toFarsiDigits(t.date)} • {t.paymentMethod === 'pos_aesthetic' ? 'پوز زیبایی' : t.paymentMethod === 'pos_dental' ? 'پوز دندانپزشکی' : t.paymentMethod === 'card_transfer' ? 'کارت به کارت' : 'نقدی'}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className={`font-black ${t.paidAmount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatCurrency(Math.abs(t.paidAmount))}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {t.receiptType === 'refund' ? 'استرداد وجه' : t.receiptType === 'deposit_allocation' ? 'تخصیص به خدمت' : 'دریافت'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 6. Audit & Operation History Timeline */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              <span>تاریخچه عملیات و رهگیری حسابرسی:</span>
            </h4>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 max-h-[190px] overflow-y-auto">
              {(!dep.history || dep.history.length === 0) ? (
                <p className="text-slate-400 text-[11px] text-center">تاریخچه‌ای ثبت نشده است.</p>
              ) : (
                dep.history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>{toFarsiDigits(h.date)} • {toFarsiDigits(h.timestamp)}</span>
                        {h.amount !== undefined && (
                          <span className="font-bold text-indigo-700">{formatCurrency(h.amount)}</span>
                        )}
                      </div>
                      <p className="text-slate-700 font-bold mt-0.5">{h.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            شناسه یکتای پرونده: {dep.id}
          </span>
          <button
            onClick={() => setSelectedDepositForDetail(null)}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            بستن پرونده
          </button>
        </div>

      </div>
    </div>
  );
};
