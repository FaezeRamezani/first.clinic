import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
import { 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Stethoscope,
  Send,
  AlertTriangle,
  CalendarCheck,
  MessageSquare,
  Check,
  X,
  Filter,
  ArrowUpDown,
  Search,
  User
} from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import type { OnlineRequest } from '../../types';

export const OnlineRequestsTab: React.FC = () => {
  const { 
    scope, 
    onlineRequests, 
    doctors, 
    appointments,
    approveOnlineRequest, 
    rejectOnlineRequest, 
    checkAppointmentConflict 
  } = useClinic();

  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [internalPracticeFilter, setInternalPracticeFilter] = useState<'all' | 'aesthetic' | 'dental'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Approval Modal States
  const [selectedReqForApproval, setSelectedReqForApproval] = useState<OnlineRequest | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [confirmedTimeSlot, setConfirmedTimeSlot] = useState<string>('۱۰:۳۰');
  const [confirmedDoctorId, setConfirmedDoctorId] = useState<string>('');
  const [smsMessage, setSmsMessage] = useState<string>('');
  const [approvalError, setApprovalError] = useState<string>('');

  // Rejection Modal States
  const [selectedReqForRejection, setSelectedReqForRejection] = useState<OnlineRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('تکمیل ظرفیت نوبت‌های پزشک در تاریخ درخواستی');

  // Top-level Global Practice Scope filter
  const scopeFilteredRequests = onlineRequests.filter(r => scope === 'unified' || r.targetPractice === scope);
  
  // Combinable filters (Status + Practice + Search)
  const filteredRequests = scopeFilteredRequests.filter(r => {
    if (activeFilter !== 'all' && r.status !== activeFilter) return false;
    if (internalPracticeFilter !== 'all' && r.targetPractice !== internalPracticeFilter) return false;
    if (searchTerm.trim()) {
      const term = toEnglishDigits(searchTerm).toLowerCase().trim();
      const nameMatch = r.patientName.toLowerCase().includes(term);
      const mobileMatch = toEnglishDigits(r.mobile).includes(term);
      const natIdMatch = r.nationalId ? toEnglishDigits(r.nationalId).includes(term) : false;
      if (!nameMatch && !mobileMatch && !natIdMatch) return false;
    }
    return true;
  });

  // Sort by registration date (Newest / Oldest)
  const displayRequests = [...filteredRequests].sort((a, b) => {
    const dateA = toEnglishDigits(a.createdAt || a.requestedDate);
    const dateB = toEnglishDigits(b.createdAt || b.requestedDate);
    return sortOrder === 'newest' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  const pendingCount = scopeFilteredRequests.filter(r => r.status === 'pending').length;
  const approvedCount = scopeFilteredRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = scopeFilteredRequests.filter(r => r.status === 'rejected').length;

  const handleOpenApprovalModal = (req: OnlineRequest) => {
    setSelectedReqForApproval(req);
    setConfirmedDate(req.requestedDate);
    setConfirmedTimeSlot(req.requestedTimeSlot || '۱۰:۳۰');
    setConfirmedDoctorId(req.doctorId); // Doctor selected by patient is FIXED (Section 5)
    setApprovalError('');

    const docName = req.doctorName;
    const defaultSms = `درخواست نوبت شما برای ${req.patientName} با موفقیت تأیید شد. تاریخ حضور: ${req.requestedDate} - ساعت: ${toFarsiDigits(req.requestedTimeSlot || '۱۰:۳۰')} (${docName}).`;
    setSmsMessage(defaultSms);
  };

  const handleDateOrTimeOrDoctorChange = (newDate: string, newSlot: string, newDocId: string) => {
    setConfirmedDate(newDate);
    setConfirmedTimeSlot(newSlot);
    setConfirmedDoctorId(newDocId);

    const docObj = doctors.find(d => d.id === newDocId);
    const docName = docObj ? docObj.name : selectedReqForApproval?.doctorName || 'پزشک';

    // Conflict Check
    const isConflict = checkAppointmentConflict(newDate, newSlot, newDocId);
    if (isConflict) {
      setApprovalError(`⚠️ زمان ${toFarsiDigits(newSlot)} در تاریخ ${newDate} برای ${docName} قبلاً رزرو شده است! لطفاً زمان دیگری را انتخاب کنید.`);
    } else {
      setApprovalError('');
    }

    if (selectedReqForApproval) {
      setSmsMessage(`درخواست نوبت شما برای ${selectedReqForApproval.patientName} با موفقیت تأیید شد. تاریخ حضور: ${newDate} - ساعت: ${toFarsiDigits(newSlot)} (${docName}).`);
    }
  };

  const handleConfirmApproval = () => {
    if (!selectedReqForApproval) return;

    // Double check conflict
    const isConflict = checkAppointmentConflict(confirmedDate, confirmedTimeSlot, confirmedDoctorId);
    if (isConflict) {
      setApprovalError('⚠️ تداخل زمان وجود دارد. امکان ثبت در این ساعت پر وجود ندارد.');
      return;
    }

    const success = approveOnlineRequest(
      selectedReqForApproval.id,
      confirmedDate,
      confirmedTimeSlot,
      confirmedDoctorId,
      smsMessage
    );

    if (success) {
      setSelectedReqForApproval(null);
    } else {
      setApprovalError('⚠️ خطا در ایجاد نوبت. لطفاً زمان دیگری انتخاب نمایید.');
    }
  };

  const handleConfirmRejection = () => {
    if (!selectedReqForRejection) return;
    rejectOnlineRequest(selectedReqForRejection.id, rejectionReason);
    setSelectedReqForRejection(null);
  };

  return (
    <div className="space-y-4">
      
      {/* Section 7: Preserved Visual Card Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">کارتابل درخواست‌های آنلاین نوبت</h3>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              درخواست‌های ثبت‌شده توسط بیماران از سایت. جهت تأیید روی (✓) و جهت رد روی (×) کلیک کنید.
            </p>
          </div>
        </div>

        {/* Sub-tabs Filters */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-amber-300 gap-1 text-xs shrink-0 shadow-2xs">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>در انتظار</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-amber-700 font-black text-[10px] rounded-full">
                {toFarsiDigits(pendingCount)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'approved' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>تأییدشده</span>
            <span className="text-[10px] opacity-80">({toFarsiDigits(approvedCount)})</span>
          </button>

          <button
            onClick={() => setActiveFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'rejected' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>ردشده</span>
            <span className="text-[10px] opacity-80">({toFarsiDigits(rejectedCount)})</span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            همه
          </button>
        </div>
      </div>

      {/* Section 6: Filter and Sort Bar (Compact, Desktop single row, Mobile wrap) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Sort Control */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">مرتب‌سازی:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="newest">جدیدترین درخواست</option>
              <option value="oldest">قدیمی‌ترین درخواست</option>
            </select>
          </div>

          {/* Internal Practice Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">مطب:</span>
            <select
              value={internalPracticeFilter}
              onChange={(e) => setInternalPracticeFilter(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="all">همه مطب‌ها</option>
              <option value="aesthetic">زیبایی</option>
              <option value="dental">دندانپزشکی</option>
            </select>
          </div>

        </div>

        {/* Search Input Box */}
        <div className="relative flex items-center w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی بیمار / همراه / کد ملی..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pr-8 pl-3 py-1.5 outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Unified Compact & Responsive Table Structure */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {displayRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            هیچ درخواستی با این فیلتر یا جستجو یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-3.5 whitespace-nowrap w-28">تاریخ ثبت</th>
                  <th className="py-3 px-3.5 whitespace-nowrap w-36">نام بیمار</th>
                  <th className="py-3 px-3.5 whitespace-nowrap w-36">شماره تماس / کد ملی</th>
                  <th className="py-3 px-3.5 whitespace-nowrap w-28">مطب</th>
                  <th className="py-3 px-3.5 whitespace-nowrap w-36">تاریخ/ساعت درخواستی</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">توضیحات بیمار</th>
                  <th className="py-3 px-3.5 whitespace-nowrap w-24">وضعیت</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {displayRequests.map((req) => {
                  const isAesthetic = req.targetPractice === 'aesthetic';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Date Created */}
                      <td className="py-3 px-3.5 text-slate-400 font-semibold whitespace-nowrap">
                        {toFarsiDigits(req.createdAt)}
                      </td>
                      
                      {/* Patient Name */}
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {req.patientName}
                      </td>
                      
                      {/* Mobile & National ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-700 dir-ltr text-right">{toFarsiDigits(req.mobile)}</p>
                        <p className="text-[10px] text-slate-400">{req.nationalId ? toFarsiDigits(req.nationalId) : '-'}</p>
                      </td>
                      
                      {/* Practice Column ONLY */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isAesthetic ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 text-[11px] font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>زیبایی</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-100 text-teal-800 text-[11px] font-bold">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                            <span>دندانپزشکی</span>
                          </span>
                        )}
                      </td>
                      
                      {/* Requested Date / Time Slot */}
                      <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                        {toFarsiDigits(req.requestedDate)} - {toFarsiDigits(req.requestedTimeSlot)}
                      </td>
                      
                      {/* Notes */}
                      <td className="py-3 px-3.5 text-slate-600 max-w-[200px] truncate" title={req.notes}>
                        {req.notes || '-'}
                      </td>
                      
                      {/* Status Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {req.status === 'pending' && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px]">
                            در انتظار
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> تأییدشده
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px] inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> ردشده
                          </span>
                        )}
                      </td>
                      
                      {/* Compact Icon Actions: ✓ and × */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenApprovalModal(req)}
                              title="تأیید و تخصیص ساعت"
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center font-black shadow-2xs transition-all cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setSelectedReqForRejection(req)}
                              title="رد درخواست"
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 border border-slate-200 active:scale-95 flex items-center justify-center font-black transition-all cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : req.status === 'approved' ? (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            ثبت در تقویم
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 font-medium max-w-[120px] truncate block mx-auto" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 5: Approval Modal with Read-Only Doctor & TimeSlotPicker */}
      {selectedReqForApproval && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">تأیید درخواست و تخصیص نوبت قطعی</h3>
                  <p className="text-[11px] text-slate-500 font-medium">بیمار: {selectedReqForApproval.patientName} ({toFarsiDigits(selectedReqForApproval.mobile)})</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReqForApproval(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* ROW 1 (Section 5): Confirmed Date & Read-Only Doctor Display in one Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Reusable JalaliDatePicker */}
                <div>
                  <JalaliDatePicker
                    label="تاریخ قطعی حضور بیمار:"
                    value={confirmedDate}
                    onChange={(newDate) => handleDateOrTimeOrDoctorChange(newDate, confirmedTimeSlot, confirmedDoctorId)}
                  />
                </div>

                {/* Read-Only Doctor Display (NOT a select) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پزشک مرتبط (درخواست بیمار):</label>
                  <div className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{selectedReqForApproval.doctorName}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-bold mr-auto">غیرقابل تغییر</span>
                  </div>
                </div>
              </div>

              {/* ROW 2 (Section 5): Time Slot Selection via TimeSlotPicker chip grid */}
              <div>
                <TimeSlotPicker
                  label="انتخاب ساعت قطعی (Time Slot):"
                  value={confirmedTimeSlot}
                  onChange={(newSlot) => handleDateOrTimeOrDoctorChange(confirmedDate, newSlot, confirmedDoctorId)}
                  date={confirmedDate}
                  doctorId={confirmedDoctorId}
                  appointments={appointments}
                />
              </div>

              {/* Real-time Conflict Alert */}
              {approvalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 font-bold flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{approvalError}</span>
                </div>
              )}

              {/* SMS Preview & Customization */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>متن پیامک تأیید برای بیمار (قابل ویرایش):</span>
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReqForApproval(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!!approvalError}
                onClick={handleConfirmApproval}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  approvalError 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>تأیید نهایی و ثبت در تقویم</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedReqForRejection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">رد درخواست نوبت آنلاین</h3>
              <button onClick={() => setSelectedReqForRejection(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>بیمار: <strong className="text-slate-900">{selectedReqForRejection.patientName}</strong></p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">علت رد درخواست:</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="تکمیل ظرفیت نوبت‌های پزشک در تاریخ درخواستی">تکمیل ظرفیت نوبت‌های پزشک در تاریخ درخواستی</option>
                  <option value="عدم حضور پزشک و مرخصی در تاریخ مورد نظر">عدم حضور پزشک و مرخصی در تاریخ مورد نظر</option>
                  <option value="لزوم مشاوره تلفنی قبل از رزرو قطعی">لزوم مشاوره تلفنی قبل از رزرو قطعی</option>
                  <option value="عدم تطابق خدمت درخواستی با تخصص مطب">عدم تطابق خدمت درخواستی با تخصص مطب</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReqForRejection(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                ثبت رد درخواست
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
