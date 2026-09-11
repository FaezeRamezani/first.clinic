import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { 
  X, 
  User, 
  AlertTriangle, 
  CalendarDays, 
  Wallet, 
  Stethoscope, 
  UploadCloud 
} from 'lucide-react';
import type { Patient } from '../../types';

interface PatientDetailModalProps {
  patient: Patient;
  onClose: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, onClose }) => {
  const { appointments, transactions, openPaymentCollection, openNewAppointment } = useClinic();
  
  const [activeTab, setActiveTab] = useState<'basic' | 'appointments' | 'ledger' | 'treatments'>('ledger');
  const [newDoctorNote, setNewDoctorNote] = useState<string>('');

  // Filter patient specific data
  const patientAppointments = appointments.filter(a => a.patientId === patient.id);
  const patientTransactions = transactions.filter(t => t.patientId === patient.id);

  // Total spent & paid calculations
  const totalSpent = patientTransactions.reduce((sum, t) => sum + t.netCost, 0);
  const totalPaid = patientTransactions.reduce((sum, t) => sum + t.paidAmount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{patient.name}</h2>
                <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded-md font-mono text-xs font-bold">
                  {toFarsiDigits(patient.fileNumber)}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[11px] font-semibold">
                  کد ملی: {toFarsiDigits(patient.nationalId)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>موبایل: {toFarsiDigits(patient.mobile)}</span>
                <span>•</span>
                <span>مطب اصلی: {patient.primaryPractice === 'aesthetic' ? 'زیبایی' : 'دندانپزشکی'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Balance Badge */}
            <div className="text-left bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-400 font-semibold">وضعیت حساب بیمار:</p>
              <p className={`text-xs font-black ${
                patient.balance < 0 ? 'text-rose-400' : patient.balance > 0 ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {patient.balance < 0 && `بدهکار (${formatCurrency(Math.abs(patient.balance))})`}
                {patient.balance > 0 && `بستانکار (${formatCurrency(patient.balance)})`}
                {patient.balance === 0 && 'تسویه کامل'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>گردش حساب و امور مالی</span>
          </button>

          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'basic'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>اطلاعات پایه و پزشکی</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'appointments'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>سوابق نوبت‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('treatments')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'treatments'
                ? 'bg-white border-slate-200 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>درمان‌ها و یادداشت‌های پزشک</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Financial Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              
              {/* Financial KPI bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">مجموع کل خدمات دریافتی:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(totalSpent)}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">مجموع پرداختی‌های قطعی:</span>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-semibold">مانده بدهی سررسیدشده:</span>
                    <p className={`text-sm font-bold mt-0.5 ${patient.balance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {patient.balance < 0 ? formatCurrency(Math.abs(patient.balance)) : '۰ تومان'}
                    </p>
                  </div>
                  {patient.balance < 0 && (
                    <button
                      onClick={() => openPaymentCollection(patient)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs text-xs"
                    >
                      + ثبت دریافت وجه
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">تاریخ (شمسی)</th>
                      <th className="py-2.5 px-3">خدمت ارائه شده</th>
                      <th className="py-2.5 px-3">مطب</th>
                      <th className="py-2.5 px-3">مبلغ کل</th>
                      <th className="py-2.5 px-3">تخفیف</th>
                      <th className="py-2.5 px-3">مبلغ دریافتی</th>
                      <th className="py-2.5 px-3 text-rose-600">بدهی باقیمانده</th>
                      <th className="py-2.5 px-3">حساب کارتخوان</th>
                      <th className="py-2.5 px-3">سررسید قسط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patientTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-800">{t.date}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{t.serviceName}</td>
                        <td className="py-3 px-3">
                          {t.practice === 'aesthetic' ? (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px]">زیبایی</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded font-semibold text-[10px]">دندانپزشکی</span>
                          )}
                        </td>
                        <td className="py-3 px-3">{formatCurrency(t.totalCost)}</td>
                        <td className="py-3 px-3 text-slate-500">{formatCurrency(t.discount)}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">{formatCurrency(t.paidAmount)}</td>
                        <td className="py-3 px-3 font-bold text-rose-600">
                          {t.remainingDebt > 0 ? formatCurrency(t.remainingDebt) : '۰'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">{t.posAccount}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600">{t.debtDueDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: Basic Info */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">اطلاعات فردی و تماس</h3>
                <p>نام و نام خانوادگی: <strong className="text-slate-900">{patient.name}</strong></p>
                <p>شماره پرونده: <strong className="text-indigo-600">{toFarsiDigits(patient.fileNumber)}</strong></p>
                <p>کد ملی: <strong>{toFarsiDigits(patient.nationalId)}</strong></p>
                <p>شماره موبایل: <strong>{toFarsiDigits(patient.mobile)}</strong></p>
                <p>تاریخ تولد: <strong>{patient.birthDate || '-'}</strong></p>
                <p>تاریخ تشکیل پرونده: <strong>{patient.createdAt}</strong></p>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">اطلاعات اضطراری و حساسیت‌ها</h3>
                <p>تماس اضطراری: <strong>{patient.emergencyContact.name} ({patient.emergencyContact.relation}) - {toFarsiDigits(patient.emergencyContact.phone)}</strong></p>
                
                <div>
                  <span className="font-bold block mb-1 text-slate-800">حساسیت‌های دارویی / پزشکی:</span>
                  {patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patient.allergies.map((alg, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {alg}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">هیچ حساسیتی ثبت نشده است</span>
                  )}
                </div>

                <div>
                  <span className="font-bold block mb-1 text-slate-800">یادداشت سوابق پزشکی:</span>
                  <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                    {patient.medicalNotes || 'توضیحات خاصی ثبت نشده است.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Appointment History */}
          {activeTab === 'appointments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">تاریخچه کامل نوبت‌های بیمار</h3>
                <button
                  onClick={() => {
                    onClose();
                    openNewAppointment({ patient });
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  + رزرو نوبت جدید
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">تاریخ نوبت</th>
                      <th className="py-2.5 px-3">ساعت</th>
                      <th className="py-2.5 px-3">پزشک / مطب</th>
                      <th className="py-2.5 px-3">خدمت</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patientAppointments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">{a.date}</td>
                        <td className="py-3 px-3 font-bold text-indigo-600">{toFarsiDigits(a.timeSlot)}</td>
                        <td className="py-3 px-3">{a.doctorName}</td>
                        <td className="py-3 px-3">{a.serviceName || 'ویزیت'}</td>
                        <td className="py-3 px-3">
                          {a.status === 'completed' && <span className="text-emerald-600 font-bold">تکمیل‌شده</span>}
                          {a.status === 'pending' && <span className="text-amber-600 font-bold">در انتظار</span>}
                          {a.status === 'checked_in' && <span className="text-blue-600 font-bold">حاضر</span>}
                          {a.status === 'unsettled' && <span className="text-rose-600 font-bold">بلاتکلیف مالی</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Treatments & Doctor Notes */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              
              {/* Doctor Log Entry Input */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800">ثبت شرح درمان جدید توسط پزشک</h3>
                <textarea
                  rows={3}
                  value={newDoctorNote}
                  onChange={(e) => setNewDoctorNote(e.target.value)}
                  placeholder="توضیحات فنی درمان، شماره دندان یا زون تزریق..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
                
                {/* Upload simulation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>آپلود عکس رادیوگرافی X-Ray / تصویر قبل و بعد</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!newDoctorNote) return;
                      alert('یادداشت درمان با موفقیت در پرونده دیجیتال بیمار ثبت گردید.');
                      setNewDoctorNote('');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    ثبت در پرونده
                  </button>
                </div>
              </div>

              {/* Timeline logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">تاریخچه درمان‌های ثبت‌شده:</h4>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 font-bold border-b border-slate-100 pb-2">
                    <span>ثبت‌شده درتاریخ ۱۰ شهریور ۱۴۰۵ توسط دکتر رمضانی</span>
                    <span className="text-indigo-600">مطب زیبایی</span>
                  </div>
                  <p className="pt-2 text-slate-800 leading-relaxed font-medium">
                    تزریق ۱ سی‌سی ژل هیالورونیک لب با تکنیک ناتشورال. روتوش پس از ۱۴ روز انجام خواهد شد. بیمار هیچگونه عارضه جانبی ثبت نکرد.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
