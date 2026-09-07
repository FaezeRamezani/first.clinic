import React, { useState } from 'react';
import { CalendarDays, Globe } from 'lucide-react';
import { TimeBlockGrid } from './TimeBlockGrid';
import { OnlineRequestsTab } from './OnlineRequestsTab';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';

export const AppointmentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'online_requests'>('schedule');
  const { onlineRequests } = useClinic();

  const pendingRequests = onlineRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Bar Switcher Tabs */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">مدیریت و برنامه تقویم نوبت‌ها</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            نمایش گرافیکی بلوک‌های زمانی مطب و کارتابل درخواست‌های سایت
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'schedule'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>جدول زمانی گرافیکی</span>
          </button>

          <button
            onClick={() => setActiveTab('online_requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'online_requests'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>کارتابل درخواست‌های آنلاین</span>
            {pendingRequests > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full">
                {toFarsiDigits(pendingRequests)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' ? <TimeBlockGrid /> : <OnlineRequestsTab />}

    </div>
  );
};
