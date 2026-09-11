import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { CalendarDays, Globe, CalendarX } from 'lucide-react';
import { TimeBlockGrid } from './TimeBlockGrid';
import { OnlineRequestsTab } from './OnlineRequestsTab';
import { CanceledWithoutReplacementTab } from './CanceledWithoutReplacementTab';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits } from '../../utils/persianUtils';
export const AppointmentsView = () => {
    const { appointmentsTab, setAppointmentsTab, onlineRequests, appointments, scope } = useClinic();
    const activeTab = appointmentsTab;
    const setActiveTab = setAppointmentsTab;
    const pendingRequests = onlineRequests.filter(r => r.status === 'pending').length;
    const canceledNoReplacementCount = appointments.filter(a => {
        const isScopeMatch = scope === 'unified' || a.practice === scope;
        return isScopeMatch && a.status === 'canceled' && a.cancellationType === 'no_replacement';
    }).length;
    return (_jsxs("div", { className: "space-y-6 pb-12", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold text-slate-800", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0648 \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0642\u0648\u06CC\u0645 \u0646\u0648\u0628\u062A\u200C\u0647\u0627" }), _jsx("p", { className: "text-xs text-slate-500 font-medium mt-0.5", children: "\u0646\u0645\u0627\u06CC\u0634 \u06AF\u0631\u0627\u0641\u06CC\u06A9\u06CC \u0628\u0644\u0648\u06A9\u200C\u0647\u0627\u06CC \u0632\u0645\u0627\u0646\u06CC \u0645\u0637\u0628\u060C \u06A9\u0627\u0631\u062A\u0627\u0628\u0644 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0622\u0646\u0644\u0627\u06CC\u0646 \u0648 \u0644\u06CC\u0633\u062A \u0644\u063A\u0648\u0634\u062F\u06AF\u0627\u0646" })] }), _jsxs("div", { className: "flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1", children: [_jsxs("button", { onClick: () => setActiveTab('schedule'), className: `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'schedule'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(CalendarDays, { className: "w-4 h-4" }), _jsx("span", { children: "\u062A\u0642\u0648\u06CC\u0645 \u0632\u0645\u0627\u0646\u06CC \u0646\u0648\u0628\u062A\u200C\u0647\u0627" })] }), _jsxs("button", { onClick: () => setActiveTab('online_requests'), className: `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'online_requests'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(Globe, { className: "w-4 h-4" }), _jsx("span", { children: "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0622\u0646\u0644\u0627\u06CC\u0646" }), pendingRequests > 0 && (_jsx("span", { className: "px-1.5 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full", children: toFarsiDigits(pendingRequests) }))] }), _jsxs("button", { onClick: () => setActiveTab('canceled_no_replacement'), className: `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'canceled_no_replacement'
                                    ? 'bg-white text-rose-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(CalendarX, { className: "w-4 h-4 text-rose-600" }), _jsx("span", { children: "\u0644\u063A\u0648\u0634\u062F\u0647 \u0628\u062F\u0648\u0646 \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646" }), canceledNoReplacementCount > 0 && (_jsx("span", { className: "px-1.5 py-0.5 bg-rose-500 text-white font-black text-[10px] rounded-full", children: toFarsiDigits(canceledNoReplacementCount) }))] })] })] }), activeTab === 'schedule' && _jsx(TimeBlockGrid, {}), activeTab === 'online_requests' && _jsx(OnlineRequestsTab, {}), activeTab === 'canceled_no_replacement' && _jsx(CanceledWithoutReplacementTab, {})] }));
};
