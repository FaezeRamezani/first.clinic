import React, { createContext, useContext, useState } from 'react';
import type { 
  ClinicScope, 
  UserRole, 
  Doctor, 
  ServiceItem, 
  Patient, 
  Appointment, 
  AppointmentStatus, 
  OnlineRequest, 
  FinancialTransaction, 
  FollowUpTask, 
  ClinicExpense,
  FollowUpStatus 
} from '../types';
import { 
  initialDoctors, 
  initialServices, 
  initialPatients, 
  initialAppointments, 
  initialOnlineRequests, 
  initialTransactions, 
  initialFollowUps, 
  initialExpenses 
} from '../data/mockData';

interface ClinicContextType {
  scope: ClinicScope;
  setScope: (scope: ClinicScope) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  doctors: Doctor[];
  services: ServiceItem[];
  patients: Patient[];
  appointments: Appointment[];
  onlineRequests: OnlineRequest[];
  transactions: FinancialTransaction[];
  followUps: FollowUpTask[];
  expenses: ClinicExpense[];

  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;

  // Modals state
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  
  isNewAppointmentOpen: boolean;
  setIsNewAppointmentOpen: (open: boolean) => void;

  isQuickCheckoutOpen: boolean;
  setIsQuickCheckoutOpen: (open: boolean) => void;
  selectedAppointmentForCheckout: Appointment | null;
  openQuickCheckout: (appointment: Appointment) => void;

  isPaymentCollectionOpen: boolean;
  setIsPaymentCollectionOpen: (open: boolean) => void;
  selectedPatientForPayment: Patient | null;
  openPaymentCollection: (patient: Patient) => void;

  isFollowUpResultOpen: boolean;
  setIsFollowUpResultOpen: (open: boolean) => void;
  selectedFollowUpTask: FollowUpTask | null;
  openFollowUpModal: (task: FollowUpTask) => void;

  isNewPatientOpen: boolean;
  setIsNewPatientOpen: (open: boolean) => void;

  isNewExpenseOpen: boolean;
  setIsNewExpenseOpen: (open: boolean) => void;

  // Action methods
  addAppointment: (apt: Omit<Appointment, 'id'>) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  approveOnlineRequest: (id: string, timeSlot: string) => void;
  rejectOnlineRequest: (id: string, reason: string) => void;
  recordCheckout: (trxData: Omit<FinancialTransaction, 'id'>) => void;
  collectPayment: (patientId: string, amount: number, method: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer', posAccount: string, notes?: string) => void;
  updateFollowUp: (id: string, status: FollowUpStatus, resultNote: string) => void;
  addPatient: (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'>) => void;
  addExpense: (expenseData: Omit<ClinicExpense, 'id'>) => void;
  addService: (serviceData: Omit<ServiceItem, 'id'>) => void;
  toggleServiceActive: (id: string) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scope, setScope] = useState<ClinicScope>('unified');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('receptionist');

  const [doctors] = useState<Doctor[]>(initialDoctors);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [onlineRequests, setOnlineRequests] = useState<OnlineRequest[]>(initialOnlineRequests);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(initialTransactions);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>(initialFollowUps);
  const [expenses, setExpenses] = useState<ClinicExpense[]>(initialExpenses);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Modals state
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState<boolean>(false);
  
  const [isQuickCheckoutOpen, setIsQuickCheckoutOpen] = useState<boolean>(false);
  const [selectedAppointmentForCheckout, setSelectedAppointmentForCheckout] = useState<Appointment | null>(null);

  const [isPaymentCollectionOpen, setIsPaymentCollectionOpen] = useState<boolean>(false);
  const [selectedPatientForPayment, setSelectedPatientForPayment] = useState<Patient | null>(null);

  const [isFollowUpResultOpen, setIsFollowUpResultOpen] = useState<boolean>(false);
  const [selectedFollowUpTask, setSelectedFollowUpTask] = useState<FollowUpTask | null>(null);

  const [isNewPatientOpen, setIsNewPatientOpen] = useState<boolean>(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState<boolean>(false);

  const openQuickCheckout = (appointment: Appointment) => {
    setSelectedAppointmentForCheckout(appointment);
    setIsQuickCheckoutOpen(true);
  };

  const openPaymentCollection = (patient: Patient) => {
    setSelectedPatientForPayment(patient);
    setIsPaymentCollectionOpen(true);
  };

  const openFollowUpModal = (task: FollowUpTask) => {
    setSelectedFollowUpTask(task);
    setIsFollowUpResultOpen(true);
  };

  const addAppointment = (aptData: Omit<Appointment, 'id'>) => {
    const newApt: Appointment = {
      ...aptData,
      id: `apt-${Date.now()}`
    };
    setAppointments(prev => [newApt, ...prev]);
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status } : apt));
  };

  const approveOnlineRequest = (id: string, timeSlot: string) => {
    const req = onlineRequests.find(r => r.id === id);
    if (!req) return;

    // Update request status
    setOnlineRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));

    // Find or create matching patient
    let patient = patients.find(p => p.mobile === req.mobile);
    let patientId = patient?.id;
    let fileNum = patient?.fileNumber || `CL-${1000 + patients.length + 1}`;

    if (!patient) {
      const newPat: Patient = {
        id: `pat-${Date.now()}`,
        fileNumber: fileNum,
        nationalId: req.nationalId || '۰۰۰۰۰۰۰۰۰۰',
        name: req.patientName,
        mobile: req.mobile,
        gender: 'female',
        primaryPractice: req.targetPractice,
        allergies: [],
        medicalNotes: req.notes || '',
        emergencyContact: { name: '-', phone: '-', relation: '-' },
        balance: 0,
        createdAt: '۱۴۰۵/۰۶/۱۶'
      };
      setPatients(prev => [newPat, ...prev]);
      patientId = newPat.id;
    }

    // Add to appointments schedule
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: patientId || `pat-${Date.now()}`,
      patientName: req.patientName,
      patientMobile: req.mobile,
      fileNumber: fileNum,
      doctorId: req.doctorId,
      doctorName: req.doctorName,
      practice: req.targetPractice,
      date: req.requestedDate,
      timeSlot: timeSlot || req.requestedTimeSlot,
      duration: 30,
      status: 'pending',
      notes: `نوبت تأییدشده از پورتال آنلاین: ${req.notes || ''}`
    };
    setAppointments(prev => [newApt, ...prev]);
  };

  const rejectOnlineRequest = (id: string, reason: string) => {
    setOnlineRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectionReason: reason } : r));
  };

  const recordCheckout = (trxData: Omit<FinancialTransaction, 'id'>) => {
    const newTrx: FinancialTransaction = {
      ...trxData,
      id: `trx-${Date.now()}`
    };

    setTransactions(prev => [newTrx, ...prev]);

    // Update appointment status to completed
    if (trxData.appointmentId) {
      setAppointments(prev => prev.map(apt => apt.id === trxData.appointmentId ? { ...apt, status: 'completed' } : apt));
    }

    // Update patient balance: negative if remaining debt, positive if overpaid
    setPatients(prev => prev.map(p => {
      if (p.id === trxData.patientId) {
        const netChange = trxData.remainingDebt > 0 ? -trxData.remainingDebt : (trxData.paidAmount - trxData.netCost);
        return {
          ...p,
          balance: p.balance + netChange
        };
      }
      return p;
    }));

    // If remaining debt > 0, generate a reminder follow-up task
    if (trxData.remainingDebt > 0 && trxData.debtDueDate) {
      const newFollowUp: FollowUpTask = {
        id: `flw-${Date.now()}`,
        patientId: trxData.patientId,
        patientName: trxData.patientName,
        patientMobile: patients.find(p => p.id === trxData.patientId)?.mobile || '',
        fileNumber: trxData.fileNumber,
        doctorId: initialDoctors.find(d => d.practice === trxData.practice)?.id || 'doc-1',
        doctorName: initialDoctors.find(d => d.practice === trxData.practice)?.name || 'پزشک',
        practice: trxData.practice,
        type: 'debt_reminder',
        description: `وصول اقساط/بدهی ${trxData.remainingDebt.toLocaleString('fa-IR')} تومانی بابت ${trxData.serviceName}`,
        dueDate: trxData.debtDueDate,
        status: 'pending'
      };
      setFollowUps(prev => [newFollowUp, ...prev]);
    }
  };

  const collectPayment = (patientId: string, amount: number, method: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer', posAccount: string, notes?: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const practice = method === 'pos_aesthetic' ? 'aesthetic' : method === 'pos_dental' ? 'dental' : patient.primaryPractice;

    const newTrx: FinancialTransaction = {
      id: `trx-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      fileNumber: patient.fileNumber,
      practice: practice,
      date: '۱۴۰۵-۰۶-۱۶',
      serviceName: 'ثبت دریافت وجه / تسویه بدهی',
      totalCost: amount,
      discount: 0,
      netCost: amount,
      paidAmount: amount,
      remainingDebt: 0,
      paymentMethod: method,
      posAccount: posAccount,
      notes: notes || 'وصول قسط / بدهی'
    };

    setTransactions(prev => [newTrx, ...prev]);

    // Reduce debt / increase balance
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, balance: p.balance + amount } : p));
  };

  const updateFollowUp = (id: string, status: FollowUpStatus, resultNote: string) => {
    setFollowUps(prev => prev.map(f => f.id === id ? {
      ...f,
      status,
      resultNote,
      updatedAt: '۱۴۰۵/۰۶/۱۶ - ۱۰:۱۵'
    } : f));
  };

  const addPatient = (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'>) => {
    const fileNumber = `CL-${1000 + patients.length + 1}`;
    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}`,
      fileNumber,
      balance: 0,
      createdAt: '۱۴۰۵/۰۶/۱۶'
    };
    setPatients(prev => [newPatient, ...prev]);
  };

  const addExpense = (expenseData: Omit<ClinicExpense, 'id'>) => {
    const newExpense: ClinicExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const addService = (serviceData: Omit<ServiceItem, 'id'>) => {
    const newService: ServiceItem = {
      ...serviceData,
      id: `srv-${Date.now()}`
    };
    setServices(prev => [...prev, newService]);
  };

  const toggleServiceActive = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return (
    <ClinicContext.Provider
      value={{
        scope,
        setScope,
        activeView,
        setActiveView,
        userRole,
        setUserRole,

        doctors,
        services,
        patients,
        appointments,
        onlineRequests,
        transactions,
        followUps,
        expenses,

        selectedPatient,
        setSelectedPatient,

        isGlobalSearchOpen,
        setIsGlobalSearchOpen,

        isNewAppointmentOpen,
        setIsNewAppointmentOpen,

        isQuickCheckoutOpen,
        setIsQuickCheckoutOpen,
        selectedAppointmentForCheckout,
        openQuickCheckout,

        isPaymentCollectionOpen,
        setIsPaymentCollectionOpen,
        selectedPatientForPayment,
        openPaymentCollection,

        isFollowUpResultOpen,
        setIsFollowUpResultOpen,
        selectedFollowUpTask,
        openFollowUpModal,

        isNewPatientOpen,
        setIsNewPatientOpen,

        isNewExpenseOpen,
        setIsNewExpenseOpen,

        addAppointment,
        updateAppointmentStatus,
        approveOnlineRequest,
        rejectOnlineRequest,
        recordCheckout,
        collectPayment,
        updateFollowUp,
        addPatient,
        addExpense,
        addService,
        toggleServiceActive
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic must be used within a ClinicProvider');
  return context;
};
