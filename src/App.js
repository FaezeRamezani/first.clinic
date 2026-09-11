import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { RemindersHubView } from './components/reminders/RemindersHubView';
import { PatientDirectoryView } from './components/patients/PatientDirectoryView';
import { FinanceView } from './components/finance/FinanceView';
import { ServicesView } from './components/services/ServicesView';
import { SettingsView } from './components/settings/SettingsView';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { NewAppointmentModal } from './components/modals/NewAppointmentModal';
import { QuickCheckoutModal } from './components/modals/QuickCheckoutModal';
import { PaymentCollectionModal } from './components/modals/PaymentCollectionModal';
import { FollowUpResultModal } from './components/modals/FollowUpResultModal';
import { NewPatientModal } from './components/modals/NewPatientModal';
import { NewExpenseModal } from './components/modals/NewExpenseModal';
import { CancelAppointmentModal } from './components/modals/CancelAppointmentModal';
import { PatientDetailModal } from './components/patients/PatientDetailModal';
const MainContent = () => {
    const { activeView, selectedPatient, setSelectedPatient } = useClinic();
    const renderActiveView = () => {
        switch (activeView) {
            case 'dashboard':
                return _jsx(DashboardView, {});
            case 'appointments':
                return _jsx(AppointmentsView, {});
            case 'reminders':
                return _jsx(RemindersHubView, {});
            case 'patients':
                return _jsx(PatientDirectoryView, {});
            case 'finance':
                return _jsx(FinanceView, {});
            case 'services':
                return _jsx(ServicesView, {});
            case 'settings':
                return _jsx(SettingsView, {});
            default:
                return _jsx(DashboardView, {});
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-slate-50 flex flex-col font-vazirmatn text-slate-800 antialiased selection:bg-indigo-500 selection:text-white", children: [_jsx(TopBar, {}), _jsxs("div", { className: "flex-1 flex", children: [_jsx(Sidebar, {}), _jsx("main", { className: "flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden", children: renderActiveView() })] }), _jsx(GlobalSearchModal, {}), _jsx(NewAppointmentModal, {}), _jsx(QuickCheckoutModal, {}), _jsx(PaymentCollectionModal, {}), _jsx(FollowUpResultModal, {}), _jsx(NewPatientModal, {}), _jsx(NewExpenseModal, {}), _jsx(CancelAppointmentModal, {}), selectedPatient && (_jsx(PatientDetailModal, { patient: selectedPatient, onClose: () => setSelectedPatient(null) }))] }));
};
export default function App() {
    return (_jsx(ClinicProvider, { children: _jsx(MainContent, {}) }));
}
