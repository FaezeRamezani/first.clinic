import React, { createContext, useContext, useState } from 'react';
import type {
  ClinicScope,
  UserRole,
  Doctor,
  ServiceItem,
  Patient,
  Appointment,
  AppointmentStatus,
  PresenceStatus,
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
import { getTodayJalaliDate, toEnglishDigits } from '../utils/persianUtils';

export interface NewAppointmentPrefillData {
  doctorId?: string;
  date?: string;
  timeSlot?: string;
  patient?: Patient | null;
  isSlotBooking?: boolean;
  previousAppointmentId?: string;
}

interface ClinicContextType {
  scope: ClinicScope;
  setScope: (scope: ClinicScope) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  remindersTab: 'today_visits' | 'overdue_debts' | 'unsettled_visits' | 'secretary_calls';
  setRemindersTab: (tab: 'today_visits' | 'overdue_debts' | 'unsettled_visits' | 'secretary_calls') => void;
  appointmentsTab: 'schedule' | 'online_requests' | 'canceled_no_replacement';
  setAppointmentsTab: (tab: 'schedule' | 'online_requests' | 'canceled_no_replacement') => void;
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
  openPatientProfile: (patientOrId: Patient | string) => void;

  // Modals state
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;

  isNewAppointmentOpen: boolean;
  setIsNewAppointmentOpen: (open: boolean) => void;
  newAppointmentPrefill: NewAppointmentPrefillData | null;
  setNewAppointmentPrefill: (prefill: NewAppointmentPrefillData | null) => void;
  openNewAppointment: (prefill?: NewAppointmentPrefillData) => void;

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

  isCancelAppointmentOpen: boolean;
  setIsCancelAppointmentOpen: (open: boolean) => void;
  selectedAppointmentForCancel: Appointment | null;
  openCancelAppointment: (apt: Appointment) => void;

  // Action methods
  addAppointment: (apt: Omit<Appointment, 'id'>) => void;
  cancelAppointment: (id: string, type: 'rescheduled' | 'no_replacement', reason?: string) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointmentPresenceStatus: (id: string, presenceStatus: PresenceStatus) => void;
  checkAppointmentConflict: (date: string, timeSlot: string, doctorId: string, excludeApptId?: string) => boolean;
  approveOnlineRequest: (id: string, confirmedDate?: string, timeSlot?: string, doctorId?: string, customMessage?: string) => boolean;
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
  const [activeViewState, setActiveViewState] = useState<string>('dashboard');

  const setActiveView = (view: string) => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const [remindersTab, setRemindersTab] = useState<'today_visits' | 'overdue_debts' | 'unsettled_visits' | 'secretary_calls'>('overdue_debts');
  const [appointmentsTab, setAppointmentsTab] = useState<'schedule' | 'online_requests' | 'canceled_no_replacement'>('schedule');
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
  const [newAppointmentPrefill, setNewAppointmentPrefill] = useState<NewAppointmentPrefillData | null>(null);

  const [isQuickCheckoutOpen, setIsQuickCheckoutOpen] = useState<boolean>(false);
  const [selectedAppointmentForCheckout, setSelectedAppointmentForCheckout] = useState<Appointment | null>(null);

  const [isPaymentCollectionOpen, setIsPaymentCollectionOpen] = useState<boolean>(false);
  const [selectedPatientForPayment, setSelectedPatientForPayment] = useState<Patient | null>(null);

  const [isFollowUpResultOpen, setIsFollowUpResultOpen] = useState<boolean>(false);
  const [selectedFollowUpTask, setSelectedFollowUpTask] = useState<FollowUpTask | null>(null);

  const [isNewPatientOpen, setIsNewPatientOpen] = useState<boolean>(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState<boolean>(false);

  const [isCancelAppointmentOpen, setIsCancelAppointmentOpen] = useState<boolean>(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<Appointment | null>(null);

  const openNewAppointment = (prefill?: NewAppointmentPrefillData) => {
    setNewAppointmentPrefill(prefill || null);
    setIsNewAppointmentOpen(true);
  };

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

  const openCancelAppointment = (apt: Appointment) => {
    setSelectedAppointmentForCancel(apt);
    setIsCancelAppointmentOpen(true);
  };

  const openPatientProfile = (patientOrId: Patient | string) => {
    if (typeof patientOrId === 'string') {
      const found = patients.find(p => p.id === patientOrId);
      if (found) setSelectedPatient(found);
    } else {
      setSelectedPatient(patientOrId);
    }
  };

  const checkAppointmentConflict = (date: string, timeSlot: string, doctorId: string, excludeApptId?: string): boolean => {
    const normDate = toEnglishDigits(date).trim().replace(/\//g, '-');
    const normSlot = toEnglishDigits(timeSlot).trim();

    return appointments.some(apt => {
      if (apt.id === excludeApptId || apt.status === 'canceled' || apt.status === 'rescheduled') return false;
      const aptDate = toEnglishDigits(apt.date).trim().replace(/\//g, '-');
      const aptSlot = toEnglishDigits(apt.timeSlot).trim();
      return apt.doctorId === doctorId && aptDate === normDate && aptSlot === normSlot;
    });
  };

  const addAppointment = (aptData: Omit<Appointment, 'id'>) => {
    const newAptId = `apt-${Date.now()}`;
    const newApt: Appointment = {
      ...aptData,
      id: newAptId
    };
    setAppointments(prev => {
      const updated = prev.map(a => {
        // Link replacement ID on previous appointment and set status to rescheduled atomically
        if (aptData.previousAppointmentId && a.id === aptData.previousAppointmentId) {
          return {
            ...a,
            status: 'rescheduled' as const,
            cancellationType: 'rescheduled' as const,
            cancellationReason: a.cancellationReason || 'تغییر نوبت و تعیین زمان جدید',
            canceledAt: getTodayJalaliDate(),
            replacementAppointmentId: newAptId
          };
        }
        // Also update any pending canceled appointment for same patient if applicable
        if (a.patientId === aptData.patientId && a.status === 'canceled' && a.cancellationType === 'no_replacement') {
          return {
            ...a,
            cancellationType: 'rescheduled' as const,
            replacementAppointmentId: newAptId
          };
        }
        return a;
      });
      return [newApt, ...updated];
    });
  };

  const cancelAppointment = (id: string, type: 'rescheduled' | 'no_replacement', reason?: string) => {
    setAppointments(prev => prev.map(apt => {
      if (apt.id === id) {
        // Prevent modifying completed/settled appointments
        if (apt.status === 'completed') return apt;

        const newStatus: AppointmentStatus = type === 'rescheduled' ? 'rescheduled' : 'canceled';
        return {
          ...apt,
          status: newStatus,
          cancellationType: type,
          cancellationReason: reason || (type === 'no_replacement' ? 'لغو شده - بدون نوبت جایگزین' : 'تغییر نوبت و تعیین زمان جدید'),
          canceledAt: getTodayJalaliDate()
        };
      }
      return apt;
    }));
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(apt => {
      // Completed, canceled, or rescheduled appointments cannot have status changed
      if (apt.id === id && apt.status !== 'completed' && apt.status !== 'canceled' && apt.status !== 'rescheduled') {
        return { ...apt, status };
      }
      return apt;
    }));
  };

  const updateAppointmentPresenceStatus = (id: string, presenceStatus: PresenceStatus) => {
    setAppointments(prev => prev.map(apt => {
      // Completed, canceled, or rescheduled appointments cannot have presence changed
      if (apt.id === id && apt.status !== 'completed' && apt.status !== 'canceled' && apt.status !== 'rescheduled') {
        return { ...apt, presenceStatus };
      }
      return apt;
    }));
  };

  const approveOnlineRequest = (id: string, confirmedDate?: string, timeSlot?: string, doctorId?: string, customMessage?: string): boolean => {
    const req = onlineRequests.find(r => r.id === id);
    if (!req) return false;

    const targetDocId = doctorId || req.doctorId;
    const targetDate = confirmedDate || req.requestedDate;
    const targetSlot = timeSlot || req.requestedTimeSlot;
    const docObj = doctors.find(d => d.id === targetDocId) || doctors[0];

    // Conflict check
    const hasConflict = checkAppointmentConflict(targetDate, targetSlot, targetDocId);
    if (hasConflict) {
      return false;
    }

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
        createdAt: getTodayJalaliDate()
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
      doctorId: targetDocId,
      doctorName: docObj.name,
      practice: req.targetPractice,
      date: targetDate,
      timeSlot: targetSlot,
      duration: 30,
      status: 'pending',
      notes: customMessage || `نوبت تأییدشده از پورتال آنلاین: ${req.notes || ''}`
    };
    setAppointments(prev => [newApt, ...prev]);
    return true;
  };

  const rejectOnlineRequest = (id: string, reason: string) => {
    setOnlineRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectionReason: reason, rejectedAt: getTodayJalaliDate() } : r));
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
        activeView: activeViewState,
        setActiveView,
        remindersTab,
        setRemindersTab,
        appointmentsTab,
        setAppointmentsTab,
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
        newAppointmentPrefill,
        setNewAppointmentPrefill,
        openNewAppointment,

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

        isCancelAppointmentOpen,
        setIsCancelAppointmentOpen,
        selectedAppointmentForCancel,
        openCancelAppointment,

        openPatientProfile,

        addAppointment,
        cancelAppointment,
        updateAppointmentStatus,
        updateAppointmentPresenceStatus,
        checkAppointmentConflict,
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
