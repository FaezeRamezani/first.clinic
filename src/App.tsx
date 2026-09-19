import React from 'react';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AppointmentsView } from './components/appointments/AppointmentsView.tsx';
import { RemindersHubView } from './components/reminders/RemindersHubView';
import { PatientDirectoryView } from './components/patients/PatientDirectoryView';
import { FinanceView } from './components/finance/FinanceView';
import { ServicesView } from './components/services/ServicesView';
import { SettingsView } from './components/settings/SettingsView';
import { ExcelImportView } from './components/import/ExcelImportView';

import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { NewAppointmentModal } from './components/modals/NewAppointmentModal';
import { QuickCheckoutModal } from './components/modals/QuickCheckoutModal';
import { PaymentCollectionModal } from './components/modals/PaymentCollectionModal';
import { FollowUpResultModal } from './components/modals/FollowUpResultModal';
import { NewPatientModal } from './components/modals/NewPatientModal';
import { NewExpenseModal } from './components/modals/NewExpenseModal';
import { CancelAppointmentModal } from './components/modals/CancelAppointmentModal';

import { PatientDetailModal } from './components/patients/PatientDetailModal';

const MainContent: React.FC = () => {
  const { 
    activeView, 
    selectedPatient, 
    setSelectedPatient
  } = useClinic();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'reminders':
        return <RemindersHubView />;
      case 'patients':
        return <PatientDirectoryView />;
      case 'import':
        return <ExcelImportView />;
      case 'finance':
        return <FinanceView />;
      case 'services':
        return <ServicesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-vazirmatn text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Fixed Topbar */}
      <TopBar />

      <div className="flex-1 flex">
        {/* Fixed Right Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Shared Global Patient Profile Detail Modal */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      {/* Global Interactive Modals */}
      <GlobalSearchModal />
      <NewAppointmentModal />
      <QuickCheckoutModal />
      <PaymentCollectionModal />
      <FollowUpResultModal />
      <NewPatientModal />
      <NewExpenseModal />
      <CancelAppointmentModal />
    </div>
  );
};

export default function App() {
  return (
    <ClinicProvider>
      <MainContent />
    </ClinicProvider>
  );
}
