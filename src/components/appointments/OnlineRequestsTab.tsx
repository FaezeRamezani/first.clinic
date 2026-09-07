import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';
import { 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Stethoscope,
  Send
} from 'lucide-react';
import type { OnlineRequest } from '../../types';

export const OnlineRequestsTab: React.FC = () => {
  const { scope, onlineRequests, approveOnlineRequest, rejectOnlineRequest } = useClinic();
  
  const [selectedReqForApproval, setSelectedReqForApproval] = useState<OnlineRequest | null>(null);
  const [confirmedTimeSlot, setConfirmedTimeSlot] = useState<string>('');

  const [selectedReqForRejection, setSelectedReqForRejection] = useState<OnlineRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('تکمیل ظرفیت نوبت‌های پزشک');

  const filteredRequests = onlineRequests.filter(r => scope === 'unified' || r.targetPractice === scope);

  const handleConfirmApproval = () => {
    if (!selectedReqForApproval) return;
    approveOnlineRequest(selectedReqForApproval.id, confirmedTimeSlot || selectedReqForApproval.requestedTimeSlot);
    setSelectedReqForApproval(null);
  };

  const handleConfirmRejection = () => {
    if (!selectedReqForRejection) return;
    rejectOnlineRequest(selectedReqForRejection.id, rejectionReason);
    setSelectedReqForRejection(null);
  };

  return (
    <div className="space-y-4">
      
      {/* Header Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">کارتابل درخواست‌های آنلاین نوبت (پورتال بیماران)</h3>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              درخواست‌های ثبت‌شده توسط بیماران از سایت کلینیک. تایید نوبت، بلافاصله پیامک پیامک تایید را ارسال می‌کند.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-200 text-amber-900 font-bold rounded-xl text-xs">
          {toFarsiDigits(filteredRequests.filter(r => r.status === 'pending').length)} درخواست جدید
        </span>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">تاریخ ثبت</th>
                <th className="py-3 px-4">نام بیمار</th>
                <th className="py-3 px-4">موبایل / کد ملی</th>
                <th className="py-3 px-4">مطب و پزشک هدف</th>
                <th className="py-3 px-4">تاریخ و ساعت پیشنهادی</th>
                <th className="py-3 px-4">توضیحات بیمار</th>
                <th className="py-3 px-4">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400 font-semibold">{req.createdAt}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{req.patientName}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-700">{toFarsiDigits(req.mobile)}</p>
                    <p className="text-[10px] text-slate-400">{req.nationalId ? toFarsiDigits(req.nationalId) : '-'}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {req.targetPractice === 'aesthetic' ? (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>{req.doctorName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {req.requestedDate} - ساعت {toFarsiDigits(req.requestedTimeSlot)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">{req.notes || '-'}</td>
                  <td className="py-3.5 px-4">
                    {req.status === 'pending' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-[10px]">
                        در انتظار بررسی
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" /> تأییدشده
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-max">
                        <XCircle className="w-3 h-3" /> ردشده
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {req.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReqForApproval(req);
                            setConfirmedTimeSlot(req.requestedTimeSlot);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                        >
                          تأیید و تخصیص ساعت
                        </button>
                        <button
                          onClick={() => setSelectedReqForRejection(req)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          رد درخواست
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {req.status === 'approved' ? 'افزوده به برنامه' : req.rejectionReason}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {selectedReqForApproval && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">تأیید نوبت آنلاین بیمار</h3>
              <button onClick={() => setSelectedReqForApproval(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>بیمار: <strong className="text-slate-900">{selectedReqForApproval.patientName}</strong> ({toFarsiDigits(selectedReqForApproval.mobile)})</p>
              <p>پزشک: <strong>{selectedReqForApproval.doctorName}</strong></p>
              <p>تاریخ درخواستی: <strong>{selectedReqForApproval.requestedDate}</strong></p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تخصیص ساعت قطعی حضور:</label>
                <input
                  type="text"
                  value={confirmedTimeSlot}
                  onChange={(e) => setConfirmedTimeSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  placeholder="مثال: ۱۰:۳۰"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
                <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>با تأیید، نوبت به تقویم افزوده شده و پیامک حاوی تاریخ و ساعت قطعی به بیمار ارسال می‌گردد.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedReqForApproval(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                تأیید نهایی و ارسال پیامک
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedReqForRejection && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">رد درخواست نوبت آنلاین</h3>
              <button onClick={() => setSelectedReqForRejection(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>بیمار: <strong className="text-slate-900">{selectedReqForRejection.patientName}</strong></p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">علت رد درخواست (ارسال در پیامک به بیمار):</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="تکمیل ظرفیت نوبت‌های پزشک در تاریخ درخواستی">تکمیل ظرفیت نوبت‌های پزشک</option>
                  <option value="عدم حضور پزشک و مرخصی در تاریخ مورد نظر">عدم حضور پزشک در تاریخ مورد نظر</option>
                  <option value="لزوم مشاوره تلفنی قبل از رزرو قطعی">لزوم مشاوره تلفنی قبل از رزرو قطعی</option>
                  <option value="عدم تطابق خدمت درخواستی با تخصص مطب">عدم تطابق خدمت با تخصص مطب</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedReqForRejection(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
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
