import React, { useState } from 'react';
import { CalendarDays, Globe, CalendarX } from 'lucide-react';
import { TimeBlockGrid } from './TimeBlockGrid';
import { OnlineRequestsTab } from './OnlineRequestsTab';
import { CanceledWithoutReplacementTab } from './CanceledWithoutReplacementTab';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';

export const AppointmentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'online_requests' | 'canceled_no_replacement'>('schedule');
  const { onlineRequests, appointments, scope } = useClinic();

  const pendingRequests = onlineRequests.filter(r => r.status === 'pending').length;
  const canceledNoReplacementCount = appointments.filter(a => {
    const isScopeMatch = scope === 'unified' || a.practice === scope;
    return isScopeMatch && a.status === 'canceled' && a.cancellationType === 'no_replacement';
  }).length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Bar Switcher Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">مدیریت و برنامه تقویم نوبت‌ها</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            نمایش گرافیکی بلوک‌های زمانی مطب، کارتابل درخواست‌های آنلاین و لیست لغوشدگان
          </p>
        </div>

        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>تقویم زمانی نوبت‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('online_requests')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'online_requests'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>درخواست‌های آنلاین</span>
            {pendingRequests > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full">
                {toFarsiDigits(pendingRequests)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('canceled_no_replacement')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'canceled_no_replacement'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarX className="w-4 h-4 text-rose-600" />
            <span>لغوشده بدون جایگزین</span>
            {canceledNoReplacementCount > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-500 text-white font-black text-[10px] rounded-full">
                {toFarsiDigits(canceledNoReplacementCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' && <TimeBlockGrid />}
      {activeTab === 'online_requests' && <OnlineRequestsTab />}
      {activeTab === 'canceled_no_replacement' && <CanceledWithoutReplacementTab />}

    </div>
  );
};
