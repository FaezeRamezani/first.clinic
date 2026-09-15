import React, { createContext, useContext, useState } from 'react';
import type {
  ClinicScope,
  PracticeType,
  PracticeMembership,
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
  FollowUpStatus,
  DoctorDaySchedule,
  PaymentAccount,
  GlobalShiftsConfig
} from '../types';
import {
  initialDoctors,
  initialServices,
  initialPatients,
  initialAppointments,
  initialOnlineRequests,
  initialTransactions,
  initialFollowUps,
  initialExpenses,
  initialPaymentAccounts,
  initialGlobalShifts
} from '../data/mockData';
import { getTodayJalaliDate, getJalaliDateOffset, toEnglishDigits, toFarsiDigits } from '../utils/persianUtils';

export const PRACTICE_PAYMENT_ACCOUNTS = {
  aesthetic: [
    'بانک ایران زمین',
    'بانک رفاه',
    'کارتخوان',
    'شیخ فضل‌الله (مجتبی)',
    'شیخ فضل‌الله (حسین)',
    'شیخ فضل‌الله (احمد)',
    'بانک سپه',
    'بانک تجارت',
    'بانک ملی',
    'نقد'
  ],
  dental: [
    'کارتخوان',
    'کارت به کارت (بانک ایران زمین)',
    'نقد'
  ]
};

export const hasPracticeMembership = (patient: Patient | null | undefined, targetScope: ClinicScope | PracticeType): boolean => {
  if (!patient) return false;
  if (targetScope === 'unified') return true;
  if (patient.memberships && patient.memberships.length > 0) {
    return patient.memberships.some(m => m.practice === targetScope);
  }
  return patient.primaryPractice === targetScope;
};

export const getPhysicalFileNumber = (patient: Patient | null | undefined, practice?: PracticeType | ClinicScope | null): string => {
  if (!patient) return '';
  const targetPractice = (practice && practice !== 'unified') ? practice : patient.primaryPractice;
  if (patient.memberships && patient.memberships.length > 0) {
    const found = patient.memberships.find(m => m.practice === targetPractice);
    if (found && found.physicalFileNumber) return found.physicalFileNumber;
    if (patient.memberships[0] && patient.memberships[0].physicalFileNumber) return patient.memberships[0].physicalFileNumber;
  }
  if (patient.primaryPractice === targetPractice && patient.fileNumber) {
    return patient.fileNumber.replace(/^CL-/, '');
  }
  return patient.fileNumber || '';
};

export const getPatientFileNumberDisplay = (patient: Patient | null | undefined, targetScope?: ClinicScope | PracticeType | null): string => {
  if (!patient) return '-';
  const dentalNum = getPhysicalFileNumber(patient, 'dental');
  const aestheticNum = getPhysicalFileNumber(patient, 'aesthetic');

  if (targetScope === 'dental') {
    return dentalNum ? toFarsiDigits(dentalNum) : (patient.fileNumber ? toFarsiDigits(patient.fileNumber) : '-');
  }
  if (targetScope === 'aesthetic') {
    return aestheticNum ? toFarsiDigits(aestheticNum) : (patient.fileNumber ? toFarsiDigits(patient.fileNumber) : '-');
  }

  // Scope === 'unified' (All practices)
  const hasDental = hasPracticeMembership(patient, 'dental');
  const hasAesthetic = hasPracticeMembership(patient, 'aesthetic');

  if (hasDental && hasAesthetic) {
    return `دندان: ${toFarsiDigits(dentalNum || '-')} | زیبایی: ${toFarsiDigits(aestheticNum || '-')}`;
  } else if (hasDental) {
    return dentalNum ? toFarsiDigits(dentalNum) : (patient.fileNumber ? toFarsiDigits(patient.fileNumber) : '-');
  } else if (hasAesthetic) {
    return aestheticNum ? toFarsiDigits(aestheticNum) : (patient.fileNumber ? toFarsiDigits(patient.fileNumber) : '-');
  }
  return patient.fileNumber ? toFarsiDigits(patient.fileNumber) : '-';
};

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
  selectedTransactionForPayment: FinancialTransaction | null;
  selectedPracticeForPayment: 'aesthetic' | 'dental' | null;
  openPaymentCollection: (patient: Patient, transaction?: FinancialTransaction | null, practice?: 'aesthetic' | 'dental') => void;

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

  // Dashboard Specific Date State
  dashboardDate: string;
  setDashboardDate: (date: string) => void;

  // Membership & File Number Helpers
  ensurePatientMembership: (patientId: string, practice: 'aesthetic' | 'dental', customFileNumber?: string) => void;
  updatePhysicalFileNumber: (patientId: string, practice: 'aesthetic' | 'dental', newFileNumber: string) => void;

  // Action methods
  addAppointment: (apt: Omit<Appointment, 'id'>) => void;
  cancelAppointment: (id: string, type: 'rescheduled' | 'no_replacement', reason?: string) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointmentPresenceStatus: (id: string, presenceStatus: PresenceStatus) => void;
  checkAppointmentConflict: (date: string, timeSlot: string, doctorId: string, excludeApptId?: string) => boolean;
  approveOnlineRequest: (id: string, confirmedDate?: string, timeSlot?: string, doctorId?: string, customMessage?: string) => boolean;
  rejectOnlineRequest: (id: string, reason: string) => void;
  recordCheckout: (trxData: Omit<FinancialTransaction, 'id'>) => void;
  collectPayment: (patientId: string, amount: number, posAccount: string, practice: 'aesthetic' | 'dental', transactionId?: string, debtDueDate?: string, notes?: string, customRecordDate?: string) => boolean;
  updateFollowUp: (id: string, status: FollowUpStatus, resultNote: string) => void;
  paymentAccounts: PaymentAccount[];
  globalShifts: GlobalShiftsConfig;
  updateGlobalShifts: (shifts: GlobalShiftsConfig) => void;
  updateDoctorSchedule: (doctorId: string, schedule: DoctorDaySchedule[]) => void;
  addPaymentAccount: (account: Omit<PaymentAccount, 'id'>) => void;
  updatePaymentAccount: (id: string, account: Omit<PaymentAccount, 'id'>) => void;
  getPracticePaymentAccounts: (practice: 'aesthetic' | 'dental') => string[];
  addPatient: (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'>) => void;
  addExpense: (expenseData: Omit<ClinicExpense, 'id'>) => void;
  addService: (serviceData: Omit<ServiceItem, 'id'>) => void;
  updateService: (id: string, serviceData: Partial<ServiceItem>) => void;
  toggleServiceActive: (id: string) => void;
  createdIncompletePatientModal: Patient | null;
  setCreatedIncompletePatientModal: (p: Patient | null) => void;
  markPatientProfileCompleted: (patientId: string) => void;
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

  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [globalShifts, setGlobalShifts] = useState<GlobalShiftsConfig>(initialGlobalShifts);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(initialPaymentAccounts);
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
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] = useState<FinancialTransaction | null>(null);
  const [selectedPracticeForPayment, setSelectedPracticeForPayment] = useState<'aesthetic' | 'dental' | null>(null);

  const [isFollowUpResultOpen, setIsFollowUpResultOpen] = useState<boolean>(false);
  const [selectedFollowUpTask, setSelectedFollowUpTask] = useState<FollowUpTask | null>(null);

  const [isNewPatientOpen, setIsNewPatientOpen] = useState<boolean>(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState<boolean>(false);

  const [isCancelAppointmentOpen, setIsCancelAppointmentOpen] = useState<boolean>(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<Appointment | null>(null);

  const [createdIncompletePatientModal, setCreatedIncompletePatientModal] = useState<Patient | null>(null);

  // Dashboard specific date state
  const [dashboardDate, setDashboardDate] = useState<string>(getTodayJalaliDate());

  const openNewAppointment = (prefill?: NewAppointmentPrefillData) => {
    setNewAppointmentPrefill(prefill || null);
    setIsNewAppointmentOpen(true);
  };

  const openQuickCheckout = (appointment: Appointment) => {
    setSelectedAppointmentForCheckout(appointment);
    setIsQuickCheckoutOpen(true);
  };

  const openPaymentCollection = (
    patient: Patient,
    transaction?: FinancialTransaction | null,
    practice?: 'aesthetic' | 'dental'
  ) => {
    const freshPatient = patients.find(p => p.id === patient.id) || patient;
    setSelectedPatientForPayment(freshPatient);
    setSelectedTransactionForPayment(transaction || null);
    setSelectedPracticeForPayment(practice || transaction?.practice || freshPatient.primaryPractice || 'aesthetic');
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

  const ensurePatientMembership = (patientId: string, practice: 'aesthetic' | 'dental', customFileNumber?: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;

      const existingMemberships = p.memberships || [];
      if (existingMemberships.some(m => m.practice === practice)) return p;

      let maxNum = 100;
      prev.forEach(item => {
        const numStr = getPhysicalFileNumber(item, practice);
        if (numStr) {
          const parsed = parseInt(numStr.replace(/\D/g, ''), 10);
          if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
        }
      });
      const fileNumToAssign = customFileNumber || String(maxNum + 1);

      return {
        ...p,
        memberships: [
          ...existingMemberships,
          { practice, physicalFileNumber: fileNumToAssign, joinedAt: getTodayJalaliDate() }
        ]
      };
    }));

    if (selectedPatient?.id === patientId) {
      setSelectedPatient(prev => {
        if (!prev) return null;
        if (prev.memberships?.some(m => m.practice === practice)) return prev;
        let maxNum = 100;
        patients.forEach(item => {
          const numStr = getPhysicalFileNumber(item, practice);
          if (numStr) {
            const parsed = parseInt(numStr.replace(/\D/g, ''), 10);
            if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
          }
        });
        const fileNumToAssign = customFileNumber || String(maxNum + 1);
        return {
          ...prev,
          memberships: [
            ...(prev.memberships || []),
            { practice, physicalFileNumber: fileNumToAssign, joinedAt: getTodayJalaliDate() }
          ]
        };
      });
    }
  };

  const updatePhysicalFileNumber = (patientId: string, practice: 'aesthetic' | 'dental', newFileNumber: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const existingMemberships = p.memberships || [];
      const hasItem = existingMemberships.some(m => m.practice === practice);
      let updated: PracticeMembership[];
      if (hasItem) {
        updated = existingMemberships.map(m => m.practice === practice ? { ...m, physicalFileNumber: newFileNumber } : m);
      } else {
        updated = [...existingMemberships, { practice, physicalFileNumber: newFileNumber, joinedAt: getTodayJalaliDate() }];
      }
      return { ...p, memberships: updated };
    }));

    if (selectedPatient?.id === patientId) {
      setSelectedPatient(prev => {
        if (!prev) return null;
        const existingMemberships = prev.memberships || [];
        const hasItem = existingMemberships.some(m => m.practice === practice);
        let updated: PracticeMembership[];
        if (hasItem) {
          updated = existingMemberships.map(m => m.practice === practice ? { ...m, physicalFileNumber: newFileNumber } : m);
        } else {
          updated = [...existingMemberships, { practice, physicalFileNumber: newFileNumber, joinedAt: getTodayJalaliDate() }];
        }
        return { ...prev, memberships: updated };
      });
    }
  };

  const addAppointment = (aptData: Omit<Appointment, 'id'>) => {
    if (aptData.patientId) {
      ensurePatientMembership(aptData.patientId, aptData.practice);
    }
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
        const updatedStatus = presenceStatus === 'present' ? 'checked_in' : (apt.status === 'checked_in' ? 'pending' : apt.status);
        return { ...apt, presenceStatus, status: updatedStatus };
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
        memberships: [{ practice: req.targetPractice, physicalFileNumber: fileNum, joinedAt: getTodayJalaliDate() }],
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

  const getMaxFileNumber = (pts: Patient[]) => {
    let maxNum = 1000;
    pts.forEach(p => {
      if (p.fileNumber) {
        const match = p.fileNumber.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return maxNum;
  };

  const recordCheckout = (trxData: Omit<FinancialTransaction, 'id'>) => {
    let finalPatientId = trxData.patientId;
    let finalFileNumber: string = trxData.fileNumber || 'CL-1000';

    const existingPatient = patients.find(p => p.id === trxData.patientId || (p.mobile && p.mobile === trxData.patientName));

    if (!existingPatient && !patients.some(p => p.id === trxData.patientId)) {
      const targetAppt = appointments.find(a => a.id === trxData.appointmentId);
      const mobileToUse = targetAppt?.patientMobile || '۰۹۱۲۰۰۰۰۰۰۰';

      const nextNum = getMaxFileNumber(patients) + 1;
      finalFileNumber = `CL-${nextNum}`;
      finalPatientId = `pat-${Date.now()}`;

      const netBalance = trxData.remainingDebt > 0 ? -trxData.remainingDebt : (trxData.paidAmount - trxData.netCost);

      const newPatient: Patient = {
        id: finalPatientId,
        fileNumber: finalFileNumber,
        memberships: [{ practice: trxData.practice || 'aesthetic', physicalFileNumber: finalFileNumber, joinedAt: getTodayJalaliDate() }],
        name: trxData.patientName,
        mobile: mobileToUse,
        primaryPractice: trxData.practice || 'aesthetic',
        balance: netBalance,
        createdAt: getTodayJalaliDate(),
        profileStatus: 'incomplete',
        allergies: [],
        medicalNotes: '',
        loginCredentials: {
          username: mobileToUse,
          password: `cl-${Math.floor(100000 + Math.random() * 900000)}`
        }
      };

      setPatients(prev => [newPatient, ...prev]);

      setAppointments(prev => prev.map(a =>
        (a.id === trxData.appointmentId || a.patientId === trxData.patientId || (a.patientName === trxData.patientName && a.patientMobile === mobileToUse))
          ? { ...a, patientId: finalPatientId, fileNumber: finalFileNumber, status: 'completed' }
          : a
      ));

      setCreatedIncompletePatientModal(newPatient);
    } else if (existingPatient) {
      finalPatientId = existingPatient.id;
      finalFileNumber = existingPatient.fileNumber || 'CL-1000';

      const netChange = trxData.remainingDebt > 0 ? -trxData.remainingDebt : (trxData.paidAmount - trxData.netCost);
      setPatients(prev => prev.map(p => p.id === existingPatient.id ? { ...p, balance: p.balance + netChange } : p));

      if (trxData.appointmentId) {
        setAppointments(prev => prev.map(apt => apt.id === trxData.appointmentId ? { ...apt, status: 'completed' } : apt));
      }
    } else if (trxData.appointmentId) {
      setAppointments(prev => prev.map(apt => apt.id === trxData.appointmentId ? { ...apt, status: 'completed' } : apt));
    }

    let effectiveDueDate = trxData.debtDueDate;
    if (trxData.remainingDebt > 0 && (!effectiveDueDate || !effectiveDueDate.trim())) {
      const matchedService = services.find(s => s.name === trxData.serviceName || s.id === (trxData as any).serviceId);
      if (matchedService?.defaultPaymentTermDays && matchedService.defaultPaymentTermDays > 0) {
        const serviceDateToUse = trxData.serviceDate || trxData.date || getTodayJalaliDate();
        effectiveDueDate = getJalaliDateOffset(serviceDateToUse, matchedService.defaultPaymentTermDays);
      }
    }

    const newTrx: FinancialTransaction = {
      ...trxData,
      debtDueDate: effectiveDueDate,
      id: `trx-${Date.now()}`,
      patientId: finalPatientId,
      fileNumber: finalFileNumber
    };

    setTransactions(prev => [newTrx, ...prev]);

    // If remaining debt > 0, generate a reminder follow-up task
    if (trxData.remainingDebt > 0 && trxData.debtDueDate) {
      const newFollowUp: FollowUpTask = {
        id: `flw-${Date.now()}`,
        patientId: finalPatientId,
        patientName: trxData.patientName,
        patientMobile: patients.find(p => p.id === finalPatientId)?.mobile || '',
        fileNumber: finalFileNumber,
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

  const collectPayment = (
    patientId: string,
    amount: number,
    posAccount: string,
    practice: 'aesthetic' | 'dental',
    transactionId?: string,
    debtDueDate?: string,
    notes?: string,
    customRecordDate?: string
  ): boolean => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || amount < 0) return false;

    const safePosAccount = posAccount || '';
    let method: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer' = 'cash';
    if (safePosAccount.includes('نقد')) {
      method = 'cash';
    } else if (safePosAccount.includes('کارت به کارت')) {
      method = 'card_transfer';
    } else if (practice === 'aesthetic') {
      method = 'pos_aesthetic';
    } else {
      method = 'pos_dental';
    }

    const todayStr = getTodayJalaliDate();
    const recordDateToUse = (customRecordDate && customRecordDate.trim()) ? customRecordDate.trim() : todayStr;

    // Identify target treatment obligation if available
    const targetTrx = transactionId
      ? transactions.find(t => t.id === transactionId)
      : transactions.find(t => t.patientId === patientId && t.practice === practice && t.trxType !== 'payment' && (t.remainingDebt > 0 || t.lastActionDate === todayStr));

    // Calculate current live remaining debt for obligation BEFORE this payment
    let currentRemaining = 0;
    if (targetTrx) {
      const linkedPayments = transactions.filter(t => t.trxType === 'payment' && (t.obligationId === targetTrx.id || (t.appointmentId && t.appointmentId === targetTrx.appointmentId)));
      const totalPaidSoFar = targetTrx.paidAmount + linkedPayments.reduce((sum, p) => sum + p.paidAmount, 0);
      currentRemaining = Math.max(0, targetTrx.netCost - totalPaidSoFar);
    } else if (patient.balance < 0) {
      currentRemaining = Math.abs(patient.balance);
    } else {
      currentRemaining = 0;
    }

    const clampedPayment = Math.max(0, isNaN(amount) ? 0 : amount);
    const remainingAfter = Math.max(0, currentRemaining - clampedPayment);

    const now = new Date();
    const timeStr = toFarsiDigits(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));

    const targetTrxName = targetTrx
      ? (clampedPayment > 0 ? `دریافت/وصول بابت ${targetTrx.serviceName}` : `تعیین سررسید بابت ${targetTrx.serviceName}`)
      : (clampedPayment > 0 ? 'وصول قسط / دریافت وجه بیمار' : 'تعیین سررسید بدهی بیمار');

    // Create NEW INDEPENDENT TRANSACTION RECEIPT RECORD
    const paymentTrx: FinancialTransaction = {
      id: `trx-pay-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      fileNumber: getPhysicalFileNumber(patient, practice) || patient.fileNumber || 'CL-1000',
      appointmentId: targetTrx?.appointmentId,
      practice: practice,
      date: recordDateToUse, // recordDate (independent)
      serviceDate: targetTrx?.serviceDate || targetTrx?.date, // serviceDate (independent)
      timestamp: timeStr,
      serviceName: targetTrxName,
      totalCost: 0,
      discount: 0,
      netCost: 0,
      paidAmount: clampedPayment,
      remainingDebt: remainingAfter,
      paymentMethod: method,
      posAccount: safePosAccount || (clampedPayment === 0 ? 'تعیین سررسید بدهی' : 'صندوق نقدی مطب'),
      debtDueDate: remainingAfter > 0 ? debtDueDate : undefined, // dueDate (independent)
      lastActionDate: recordDateToUse,
      notes: notes || (clampedPayment > 0 ? 'ثبت دریافت وجه' : 'تعیین سررسید بدهی بدون دریافت وجه'),
      trxType: 'payment',
      obligationId: targetTrx?.id || `ob-${patient.id}`
    };

    // Prepend new payment record WITHOUT mutating past transactions (100% immutable historical records)
    setTransactions(prev => [paymentTrx, ...prev]);

    // Update Patient Account Balance & Sync Active Patient States
    if (clampedPayment > 0) {
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, balance: p.balance + clampedPayment } : p));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(prev => prev ? { ...prev, balance: prev.balance + clampedPayment } : null);
      }
      if (selectedPatientForPayment?.id === patientId) {
        setSelectedPatientForPayment(prev => prev ? { ...prev, balance: prev.balance + clampedPayment } : null);
      }
    }

    // Handle FollowUpTask if debt remains
    const docObj = doctors.find(d => d.practice === practice) || doctors[0];
    if (remainingAfter > 0 && debtDueDate) {
      const existingFlw = followUps.find(f => f.patientId === patientId && f.practice === practice && f.status === 'pending');
      if (existingFlw) {
        setFollowUps(prev => prev.map(f => f.id === existingFlw.id ? { ...f, dueDate: debtDueDate } : f));
      } else {
        const newFlw: FollowUpTask = {
          id: `flw-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          patientMobile: patient.mobile,
          fileNumber: getPhysicalFileNumber(patient, practice) || patient.fileNumber || 'CL-1000',
          doctorId: docObj?.id || 'doc-1',
          doctorName: docObj?.name || 'پزشک',
          practice: practice,
          type: 'debt_reminder',
          description: `پیگیری مانده بدهی ${remainingAfter.toLocaleString('fa-IR')} تومانی`,
          dueDate: debtDueDate,
          status: 'pending'
        };
        setFollowUps(prev => [newFlw, ...prev]);
      }
    } else if (remainingAfter === 0) {
      setFollowUps(prev => prev.map(f => (f.patientId === patientId && f.practice === practice && f.type === 'debt_reminder' && f.status === 'pending') ? { ...f, status: 'completed', resultNote: 'بدهی به طور کامل تسویه گردید' } : f));
    }

    return true;
  };

  const updateFollowUp = (id: string, status: FollowUpStatus, resultNote: string) => {
    setFollowUps(prev => prev.map(f => f.id === id ? {
      ...f,
      status,
      resultNote,
      updatedAt: '۱۴۰۵/۰۶/۱۶ - ۱۰:۱۵'
    } : f));
  };

  const markPatientProfileCompleted = (patientId: string) => {
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, profileStatus: 'completed' } : p));
  };

  const addPatient = (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'>) => {
    const targetPractice = patientData.primaryPractice || 'aesthetic';

    // Calculate next physical file number for this practice
    let maxNum = 100;
    patients.forEach(item => {
      const numStr = getPhysicalFileNumber(item, targetPractice);
      if (numStr) {
        const parsed = parseInt(numStr.replace(/\D/g, ''), 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    });
    const assignedPhysicalNum = String(maxNum + 1);
    const fileNumber = `CL-${getMaxFileNumber(patients) + 1}`;

    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}`,
      fileNumber,
      primaryPractice: targetPractice,
      memberships: patientData.memberships || [
        { practice: targetPractice, physicalFileNumber: assignedPhysicalNum, joinedAt: getTodayJalaliDate() }
      ],
      balance: 0,
      createdAt: getTodayJalaliDate(),
      profileStatus: 'completed'
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

  const updateService = (id: string, updatedData: Partial<ServiceItem>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
  };

  const updateDoctorSchedule = (doctorId: string, schedule: DoctorDaySchedule[]) => {
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, weeklySchedule: schedule } : d));
  };

  const addPaymentAccount = (accountData: Omit<PaymentAccount, 'id'>) => {
    const newAcc: PaymentAccount = {
      ...accountData,
      id: `acc-${Date.now()}`
    };
    setPaymentAccounts(prev => [...prev, newAcc]);
  };

  const updatePaymentAccount = (id: string, accountData: Omit<PaymentAccount, 'id'>) => {
    setPaymentAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...accountData } : acc));
  };

  const getPracticePaymentAccounts = (practice: 'aesthetic' | 'dental'): string[] => {
    const matched = paymentAccounts.filter(acc => acc.practice === practice).map(acc => acc.name);
    if (matched.length > 0) return matched;
    return PRACTICE_PAYMENT_ACCOUNTS[practice] || [];
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
        paymentAccounts,
        globalShifts,
        updateGlobalShifts: setGlobalShifts,

        updateDoctorSchedule,
        addPaymentAccount,
        updatePaymentAccount,
        getPracticePaymentAccounts,

        selectedPatient,
        setSelectedPatient,

        ensurePatientMembership,
        updatePhysicalFileNumber,

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
        selectedTransactionForPayment,
        selectedPracticeForPayment,
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

        dashboardDate,
        setDashboardDate,

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
        updateService,
        toggleServiceActive,
        createdIncompletePatientModal,
        setCreatedIncompletePatientModal,
        markPatientProfileCompleted
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
