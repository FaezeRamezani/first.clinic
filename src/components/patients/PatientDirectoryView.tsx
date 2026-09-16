import React, { useState } from 'react';
import { useClinic, hasPracticeMembership, getPhysicalFileNumber, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate } from '../../utils/persianUtils';
import { 
  Search, 
  Plus, 
  Eye, 
  CalendarPlus, 
  CreditCard, 
  Sparkles, 
  Stethoscope,
  Users,
  UserX,
  Key,
  Clock
} from 'lucide-react';
import { PatientDetailModal } from './PatientDetailModal';

export const PatientDirectoryView: React.FC = () => {
  const { 
    scope, 
    patients, 
    setSelectedPatient, 
    selectedPatient, 
    setIsNewPatientOpen, 
    openNewAppointment,
    openPaymentCollection,
    setCreatedIncompletePatientModal
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'completed' | 'incomplete'>('completed');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter patients by scope using practice membership
  const scopePatients = patients.filter(p => hasPracticeMembership(p, scope));

  // Separate completed and incomplete profiles (incomplete profiles are shown only after checkout when a physical file number is assigned)
  const completedPatients = scopePatients.filter(p => p.profileStatus === 'completed');
  const incompletePatients = scopePatients.filter(p => p.profileStatus === 'incomplete' && p.memberships && p.memberships.length > 0 && p.memberships.some(m => !!m.physicalFileNumber));

  // Filter currently active tab by search query
  const targetPatients = activeTab === 'completed' ? completedPatients : incompletePatients;

  const filteredPatients = targetPatients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const hasMatchName = p.name.toLowerCase().includes(q);
    const hasMatchMobile = p.mobile.includes(q);
    const hasMatchFile = (p.fileNumber && p.fileNumber.toLowerCase().includes(q)) ||
                         getPhysicalFileNumber(p, 'dental').includes(q) ||
                         getPhysicalFileNumber(p, 'aesthetic').includes(q);
    const hasMatchNational = p.nationalId && p.nationalId.includes(q);
    return hasMatchName || hasMatchMobile || hasMatchFile || hasMatchNational;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">بانک جامع پرونده‌های دیجیتال بیماران</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            جستجوی سریع پرونده، سوابق درمان، گردش مالی و پرونده‌های در انتظار تکمیل اطلاعات
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام، موبایل، کد ملی یا پرونده..."
              className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-1.5 text-xs font-semibold text-slate-800 outline-none w-64 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setIsNewPatientOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ تشکیل پرونده جدید</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>پرونده بیماران</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {toFarsiDigits(completedPatients.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incomplete')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === 'incomplete'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>پرونده‌های ناقص</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'incomplete' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
          }`}>
            {toFarsiDigits(incompletePatients.length)}
          </span>
          {incompletePatients.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-1 -right-1 animate-ping" />
          )}
        </button>
      </div>

      {/* Tab 1: Completed Patients Table */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4">شماره پرونده</th>
                  <th className="py-3.5 px-4">نام و نام خانوادگی</th>
                  <th className="py-3.5 px-4">شماره موبایل</th>
                  <th className="py-3.5 px-4">کد ملی</th>
                  <th className="py-3.5 px-4">عضویت در مطب‌ها</th>
                  <th className="py-3.5 px-4">مانده حساب / تراز</th>
                  <th className="py-3.5 px-4 text-center">عملیات پرونده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      هیچ پرونده کاملی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* File Number */}
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dir-ltr text-right">
                        {toFarsiDigits(getPatientFileNumberDisplay(patient, scope))}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {patient.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{patient.name}</span>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 font-bold text-slate-700 dir-ltr text-right">
                        {toFarsiDigits(patient.mobile)}
                      </td>

                      {/* National ID */}
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {patient.nationalId ? toFarsiDigits(patient.nationalId) : '-'}
                      </td>

                      {/* Practice Memberships */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasPracticeMembership(patient, 'dental') && (
                            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                              <Stethoscope className="w-3 h-3 text-teal-500" /> دندانپزشکی
                            </span>
                          )}
                          {hasPracticeMembership(patient, 'aesthetic') && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                              <Sparkles className="w-3 h-3 text-indigo-500" /> زیبایی
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Account Balance */}
                      <td className="py-3.5 px-4">
                        {patient.balance < 0 && (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-[11px]">
                            بدهکار ({formatCurrency(Math.abs(patient.balance))})
                          </span>
                        )}
                        {patient.balance > 0 && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]">
                            بستانکار ({formatCurrency(patient.balance)})
                          </span>
                        )}
                        {patient.balance === 0 && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg text-[11px]">
                            تسویه کامل
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهده پرونده</span>
                          </button>

                          <button
                            onClick={() => openNewAppointment({ patient })}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>نوبت</span>
                          </button>

                          {patient.balance < 0 && (
                            <button
                              onClick={() => openPaymentCollection(patient)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>تسویه</span>
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Incomplete Patients Table */}
      {activeTab === 'incomplete' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          <div className="p-4 bg-amber-50/60 border-b border-amber-200/70 flex items-center justify-between text-xs text-amber-900 font-medium">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                این لیست شامل مراجعینی است که بدون داشتن پرونده اولیه مراجعه نموده و پس از انجام عملیات مالی، برای آن‌ها شماره پرونده صادر شده است.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4">شماره پرونده</th>
                  <th className="py-3.5 px-4">نام بیمار</th>
                  <th className="py-3.5 px-4">شماره موبایل</th>
                  <th className="py-3.5 px-4">مطب</th>
                  <th className="py-3.5 px-4">تاریخ ایجاد</th>
                  <th className="py-3.5 px-4">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      هیچ پرونده ناقصی وجود ندارد.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* File Number */}
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dir-ltr text-right">
                        {toFarsiDigits(getPatientFileNumberDisplay(patient, scope))}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            {patient.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{patient.name}</span>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 font-bold text-slate-700 dir-ltr text-right">
                        {toFarsiDigits(patient.mobile)}
                      </td>

                      {/* Practice Memberships */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasPracticeMembership(patient, 'dental') && (
                            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                              <Stethoscope className="w-3 h-3 text-teal-500" /> دندانپزشکی
                            </span>
                          )}
                          {hasPracticeMembership(patient, 'aesthetic') && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                              <Sparkles className="w-3 h-3 text-indigo-500" /> زیبایی
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date Created */}
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">
                        {toFarsiDigits(patient.createdAt || getTodayJalaliDate())}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg text-[11px] border border-amber-200 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>در انتظار تکمیل اطلاعات</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          
                          {/* View Profile */}
                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="مشاهده اطلاعات پرونده"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهده پرونده</span>
                          </button>

                          {/* Credentials Modal */}
                          <button
                            onClick={() => setCreatedIncompletePatientModal(patient)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="نمایش نام کاربری و رمز عبور"
                          >
                            <Key className="w-3.5 h-3.5 text-indigo-600" />
                            <span>اطلاعات ورود</span>
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Patient Digital Profile Drawer */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

    </div>
  );
};
