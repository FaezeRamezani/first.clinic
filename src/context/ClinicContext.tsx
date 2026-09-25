import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  ClinicScope,
  PracticeType,
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
  ExpenseCategory,
  FollowUpStatus,
  DoctorDaySchedule,
  PaymentAccount,
  GlobalShiftsConfig
} from '../types';
import { getTodayJalaliDate, getJalaliDateOffset, toEnglishDigits, toFarsiDigits } from '../utils/persianUtils';
import { settingsApi, doctorsApi, servicesApi, paymentAccountsApi, patientsApi, appointmentsApi, financeApi, followUpsApi, onlineRequestsApi } from '../services/api';

const DEFAULT_GLOBAL_SHIFTS: GlobalShiftsConfig = {
  morning: { startTime: '09:00', endTime: '14:00' },
  evening: { startTime: '16:00', endTime: '21:00' }
};

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'consumables', name: 'مواد مصرفی' },
  { id: 'rent', name: 'اجاره و رهن' },
  { id: 'salaries', name: 'حقوق پرسنل' },
  { id: 'equipment', name: 'تجهیزات و تعمیرات' },
  { id: 'utilities', name: 'قبوض و نگهداری' },
  { id: 'other', name: 'متفرقه' }
];

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
  const targetPractice = (practice && practice !== 'unified') ? practice : null;
  if (targetPractice) {
    if (patient.memberships && patient.memberships.length > 0) {
      const found = patient.memberships.find(m => m.practice === targetPractice);
      if (found && found.physicalFileNumber) return found.physicalFileNumber;
    }
    if (patient.primaryPractice === targetPractice && patient.fileNumber) {
      return patient.fileNumber.replace(/^CL-/, '');
    }
    return '';
  }

  // Fallback when no specific practice is requested
  if (patient.memberships && patient.memberships.length > 0) {
    const primary = patient.memberships.find(m => m.practice === patient.primaryPractice) || patient.memberships[0];
    if (primary && primary.physicalFileNumber) return primary.physicalFileNumber;
  }
  if (patient.fileNumber) {
    return patient.fileNumber.replace(/^CL-/, '');
  }
  return '';
};

export const getPatientFileNumberDisplay = (patient: Patient | null | undefined, targetScope?: ClinicScope | PracticeType | null): string => {
  if (!patient) return '-';
  const dentalNum = getPhysicalFileNumber(patient, 'dental');
  const aestheticNum = getPhysicalFileNumber(patient, 'aesthetic');

  if (targetScope === 'dental') {
    return dentalNum ? toFarsiDigits(dentalNum) : '-';
  }
  if (targetScope === 'aesthetic') {
    return aestheticNum ? toFarsiDigits(aestheticNum) : '-';
  }

  // Scope === 'unified' (All practices)
  const hasDental = hasPracticeMembership(patient, 'dental');
  const hasAesthetic = hasPracticeMembership(patient, 'aesthetic');

  if (hasDental && hasAesthetic) {
    return `دندان: ${toFarsiDigits(dentalNum || '-')} | زیبایی: ${toFarsiDigits(aestheticNum || '-')}`;
  } else if (hasDental) {
    return dentalNum ? `دندان: ${toFarsiDigits(dentalNum)}` : '-';
  } else if (hasAesthetic) {
    return aestheticNum ? `زیبایی: ${toFarsiDigits(aestheticNum)}` : '-';
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
  approveOnlineRequest: (id: string, confirmedDate?: string, timeSlot?: string, doctorId?: string, customMessage?: string) => boolean | Promise<boolean>;
  rejectOnlineRequest: (id: string, reason: string) => void | Promise<void>;
  recordCheckout: (trxData: Omit<FinancialTransaction, 'id'>) => void;
  collectPayment: (patientId: string, amount: number, posAccount: string, practice: 'aesthetic' | 'dental', transactionId?: string, debtDueDate?: string, notes?: string, customRecordDate?: string) => boolean | Promise<boolean>;
  updateFollowUp: (id: string, status: FollowUpStatus, resultNote: string) => void | Promise<void>;
  createTask: (taskData: Omit<FollowUpTask, 'id'> & { title?: string }) => void | Promise<void>;
  paymentAccounts: PaymentAccount[];
  globalShifts: GlobalShiftsConfig;
  updateGlobalShifts: (shifts: GlobalShiftsConfig) => void;
  expenseCategories: ExpenseCategory[];
  updateExpenseCategories: (categories: ExpenseCategory[]) => Promise<void>;
  updateDoctorSchedule: (doctorId: string, schedule: DoctorDaySchedule[]) => void;
  addPaymentAccount: (account: Omit<PaymentAccount, 'id'>) => void;
  updatePaymentAccount: (id: string, account: Omit<PaymentAccount, 'id'>) => void;
  getPracticePaymentAccounts: (practice: 'aesthetic' | 'dental') => string[];
  addPatient: (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'>) => Promise<Patient>;
  addExpense: (expenseData: Omit<ClinicExpense, 'id'>) => void;
  addService: (serviceData: Omit<ServiceItem, 'id'>) => void;
  updateService: (id: string, serviceData: Partial<ServiceItem>) => void;
  toggleServiceActive: (id: string) => void;
  createdIncompletePatientModal: Patient | null;
  setCreatedIncompletePatientModal: (p: Patient | null) => void;
  markPatientProfileCompleted: (patientId: string) => void;
  refreshPatients: () => Promise<void>;
  mergePatients: (patientAId: string, patientBId: string, primaryPatientId: string) => Promise<Patient>;
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

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [globalShifts, setGlobalShifts] = useState<GlobalShiftsConfig>(DEFAULT_GLOBAL_SHIFTS);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [onlineRequests, setOnlineRequests] = useState<OnlineRequest[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [expenses, setExpenses] = useState<ClinicExpense[]>([]);

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

  // Phase 2-7: Initial Fetch for Persistent Backend Domain Data
  useEffect(() => {
    let isMounted = true;

    const loadBackendData = async () => {
      try {
        const [shiftsData, catsData, docsData, srvsData, accsData, patsData, aptsData, trxsData, expsData, tasksData, reqsData] = await Promise.all([
          settingsApi.getGlobalShifts().catch(() => null),
          settingsApi.getExpenseCategories().catch(() => null),
          doctorsApi.getDoctors().catch(() => null),
          servicesApi.getServices().catch(() => null),
          paymentAccountsApi.getPaymentAccounts().catch(() => null),
          patientsApi.getPatients().catch(() => null),
          appointmentsApi.getAppointments().catch(() => null),
          financeApi.getTransactions().catch(() => null),
          financeApi.getExpenses().catch(() => null),
          followUpsApi.getTasks().catch(() => null),
          onlineRequestsApi.getRequests().catch(() => null)
        ]);

        if (!isMounted) return;

        if (shiftsData) setGlobalShifts(shiftsData);
        if (Array.isArray(catsData) && catsData.length > 0) setExpenseCategories(catsData);
        if (Array.isArray(docsData)) setDoctors(docsData);
        if (Array.isArray(srvsData)) setServices(srvsData);
        if (Array.isArray(accsData)) setPaymentAccounts(accsData);
        if (Array.isArray(patsData)) setPatients(patsData);
        if (Array.isArray(aptsData)) setAppointments(aptsData);
        if (Array.isArray(trxsData)) setTransactions(trxsData);
        if (Array.isArray(expsData)) setExpenses(expsData);
        if (Array.isArray(tasksData)) setFollowUps(tasksData);
        if (Array.isArray(reqsData)) setOnlineRequests(reqsData);
      } catch (err) {
        console.error('Failed to load initial Phase 6 backend data:', err);
      }
    };

    loadBackendData();

    return () => {
      isMounted = false;
    };
  }, []);

  const openNewAppointment = (prefill?: NewAppointmentPrefillData) => {
    setNewAppointmentPrefill(prefill || null);
    setIsNewAppointmentOpen(true);
  };

  const openQuickCheckout = (appointment: Appointment) => {
    if (appointment.id && transactions.some(t => t.appointmentId === appointment.id)) {
      alert('برای این نوبت قبلاً تسویه مالی انجام شده است.');
      return;
    }
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

  const ensurePatientMembership = async (patientId: string, practice: 'aesthetic' | 'dental', customFileNumber?: string) => {
    // Check if patient already has membership for this practice in current state
    const existingPatient = patients.find(p => p.id === patientId);
    if (existingPatient?.memberships?.some(m => m.practice === practice)) {
      return;
    }

    try {
      const updated = await patientsApi.addPatientMembership(patientId, practice, customFileNumber);
      setPatients(prev => prev.map(p => p.id === patientId ? updated : p));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(updated);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('از قبل در این مطب دارای پرونده') || err.message.includes('عضویت فعال در این مطب'))) {
        console.info('Patient already has membership for practice:', practice);
        return;
      }
      console.error('Failed to ensure patient membership:', err);
      alert(err.message || 'خطا در ثبت عضویت مطب بیمار');
    }
  };

  const updatePhysicalFileNumber = async (patientId: string, practice: 'aesthetic' | 'dental', newFileNumber: string) => {
    try {
      const updated = await patientsApi.updatePhysicalFileNumber(patientId, practice, newFileNumber);
      setPatients(prev => prev.map(p => p.id === patientId ? updated : p));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(updated);
      }
    } catch (err: any) {
      console.error('Failed to update physical file number:', err);
      alert(err.message || 'خطا در تغییر شماره پرونده فیزیکی');
    }
  };

  const addAppointment = async (aptData: Omit<Appointment, 'id'>) => {
    try {
      if (aptData.patientId) {
        await ensurePatientMembership(aptData.patientId, aptData.practice);
      }
      await appointmentsApi.createAppointment(aptData);
      const [freshApts, freshPats] = await Promise.all([
        appointmentsApi.getAppointments(),
        patientsApi.getPatients()
      ]);
      setAppointments(freshApts);
      setPatients(freshPats);
    } catch (err: any) {
      console.error('Failed to add appointment:', err);
      alert(err.message || 'خطا در ثبت نوبت جدید');
    }
  };

  const cancelAppointment = async (id: string, type: 'rescheduled' | 'no_replacement', reason?: string) => {
    try {
      await appointmentsApi.cancelAppointment(id, type, reason);
      const freshApts = await appointmentsApi.getAppointments();
      setAppointments(freshApts);
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      alert(err.message || 'خطا در لغو نوبت');
    }
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await appointmentsApi.updateAppointmentStatus(id, status);
      const freshApts = await appointmentsApi.getAppointments();
      setAppointments(freshApts);
    } catch (err: any) {
      console.error('Failed to update appointment status:', err);
      alert(err.message || 'خطا در تغییر وضعیت نوبت');
    }
  };

  const updateAppointmentPresenceStatus = async (id: string, presenceStatus: PresenceStatus) => {
    try {
      const targetApt = appointments.find(a => a.id === id);
      await appointmentsApi.updateAppointmentPresenceStatus(id, presenceStatus, targetApt?.status);
      const freshApts = await appointmentsApi.getAppointments();
      setAppointments(freshApts);
    } catch (err: any) {
      console.error('Failed to update presence status:', err);
      alert(err.message || 'خطا در تغییر وضعیت حضور بیمار');
    }
  };

  const approveOnlineRequest = async (
    id: string,
    confirmedDate?: string,
    timeSlot?: string,
    doctorId?: string,
    customMessage?: string
  ): Promise<boolean> => {
    try {
      await onlineRequestsApi.approveRequest(id, {
        confirmedDate,
        timeSlot,
        doctorId,
        customMessage
      });

      const [freshReqs, freshApts, freshPats] = await Promise.all([
        onlineRequestsApi.getRequests(),
        appointmentsApi.getAppointments(),
        patientsApi.getPatients()
      ]);

      setOnlineRequests(freshReqs);
      setAppointments(freshApts);
      setPatients(freshPats);
      return true;
    } catch (err: any) {
      console.error('Failed to approve online request:', err);
      alert(err.message || 'خطا در تأیید درخواست آنلاین');
      return false;
    }
  };

  const rejectOnlineRequest = async (id: string, reason: string) => {
    try {
      await onlineRequestsApi.rejectRequest(id, reason);
      const freshReqs = await onlineRequestsApi.getRequests();
      setOnlineRequests(freshReqs);
    } catch (err: any) {
      console.error('Failed to reject online request:', err);
      alert(err.message || 'خطا در رد درخواست آنلاین');
    }
  };

  const recordCheckout = async (trxData: Omit<FinancialTransaction, 'id'>) => {
    try {
      if (trxData.appointmentId && transactions.some(t => t.appointmentId === trxData.appointmentId)) {
        alert('برای این نوبت قبلاً تسویه مالی ثبت شده است.');
        return;
      }
      let finalPatientId = trxData.patientId;
      const existingPatient = patients.find(p => p.id === trxData.patientId || (p.mobile && p.mobile === trxData.patientName));

      const isUnprofiled = !existingPatient || !existingPatient.memberships || existingPatient.memberships.length === 0 || !existingPatient.memberships.some(m => !!m.physicalFileNumber);

      if (isUnprofiled) {
        const targetAppt = appointments.find(a => a.id === trxData.appointmentId);
        const mobileToUse = targetAppt?.patientMobile || (existingPatient ? existingPatient.mobile : '۰۹۱۲۰۰۰۰۰۰۰');

        let createdPt: Patient;
        if (existingPatient) {
          createdPt = await patientsApi.updatePatient(existingPatient.id, {
            profileStatus: 'completed'
          });
          await ensurePatientMembership(existingPatient.id, trxData.practice || 'aesthetic');
        } else {
          createdPt = await patientsApi.createPatient({
            name: trxData.patientName,
            mobile: mobileToUse,
            primaryPractice: trxData.practice || 'aesthetic',
            profileStatus: 'completed',
            memberships: [{ practice: trxData.practice || 'aesthetic', physicalFileNumber: '' }]
          });
        }
        finalPatientId = createdPt.id;
      } else if (existingPatient) {
        finalPatientId = existingPatient.id;
      }

      let effectiveDueDate = trxData.debtDueDate;
      if (trxData.remainingDebt > 0 && (!effectiveDueDate || !effectiveDueDate.trim())) {
        const matchedService = services.find(s => s.name === trxData.serviceName || s.id === (trxData as any).serviceId);
        if (matchedService?.defaultPaymentTermDays && matchedService.defaultPaymentTermDays > 0) {
          const serviceDateToUse = trxData.serviceDate || trxData.date || getTodayJalaliDate();
          effectiveDueDate = getJalaliDateOffset(serviceDateToUse, matchedService.defaultPaymentTermDays);
        }
      }

      await financeApi.createObligation({
        patientId: finalPatientId,
        appointmentId: trxData.appointmentId,
        serviceId: (trxData as any).serviceId,
        practice: trxData.practice || 'aesthetic',
        serviceDate: trxData.serviceDate || trxData.date || getTodayJalaliDate(),
        recordDate: trxData.date || getTodayJalaliDate(),
        serviceName: trxData.serviceName,
        totalCost: trxData.totalCost || 0,
        discount: trxData.discount || 0,
        dueDate: effectiveDueDate,
        notes: trxData.notes,
        paidAmount: trxData.paidAmount || 0,
        paymentMethod: trxData.paymentMethod,
        posAccount: trxData.posAccount
      });

      const [freshTrxs, freshPats, freshApts] = await Promise.all([
        financeApi.getTransactions(),
        patientsApi.getPatients(),
        appointmentsApi.getAppointments()
      ]);

      setTransactions(freshTrxs);
      setPatients(freshPats);
      setAppointments(freshApts);
    } catch (err: any) {
      console.error('Failed to record checkout:', err);
      alert(err.message || 'خطا در ثبت تسویه مالی');
    }
  };

  const collectPayment = async (
    patientId: string,
    amount: number,
    posAccount: string,
    practice: 'aesthetic' | 'dental',
    transactionId?: string,
    debtDueDate?: string,
    notes?: string,
    customRecordDate?: string
  ): Promise<boolean> => {
    try {
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

      const targetTrx = transactionId
        ? transactions.find(t => t.id === transactionId)
        : transactions.find(t => t.patientId === patientId && t.practice === practice && t.trxType !== 'payment' && (t.remainingDebt > 0 || t.lastActionDate === todayStr));

      await financeApi.recordPayment({
        obligationId: targetTrx?.obligationId || targetTrx?.id,
        patientId,
        practice,
        recordDate: recordDateToUse,
        serviceDate: targetTrx?.serviceDate || targetTrx?.date,
        paidAmount: amount,
        paymentMethod: method,
        posAccount: safePosAccount,
        debtDueDate,
        notes
      });

      const [freshTrxs, freshPats] = await Promise.all([
        financeApi.getTransactions(),
        patientsApi.getPatients()
      ]);

      setTransactions(freshTrxs);
      setPatients(freshPats);
      if (selectedPatient?.id === patientId) {
        const freshSelected = freshPats.find(p => p.id === patientId);
        if (freshSelected) setSelectedPatient(freshSelected);
      }
      return true;
    } catch (err: any) {
      console.error('Failed to collect payment:', err);
      alert(err.message || 'خطا در ثبت دریافت وجه');
      return false;
    }
  };

  const updateFollowUp = async (id: string, status: FollowUpStatus, resultNote: string) => {
    try {
      await followUpsApi.updateTaskStatus(id, status, resultNote);
      const freshTasks = await followUpsApi.getTasks();
      setFollowUps(freshTasks);
    } catch (err: any) {
      console.error('Failed to update follow-up task:', err);
      alert(err.message || 'خطا در تغییر وضعیت یادآوری');
    }
  };

  const createTask = async (taskData: Omit<FollowUpTask, 'id'> & { title?: string }) => {
    try {
      await followUpsApi.createTask(taskData);
      const freshTasks = await followUpsApi.getTasks();
      setFollowUps(freshTasks);
    } catch (err: any) {
      console.error('Failed to create task:', err);
      alert(err.message || 'خطا در ثبت یادآوری');
    }
  };

  const markPatientProfileCompleted = async (patientId: string) => {
    try {
      const updated = await patientsApi.updatePatient(patientId, { profileStatus: 'completed' });
      setPatients(prev => prev.map(p => p.id === patientId ? updated : p));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(updated);
      }
    } catch (err: any) {
      console.error('Failed to mark patient profile completed:', err);
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, profileStatus: 'completed' } : p));
    }
  };

  const addPatient = async (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'>): Promise<Patient> => {
    try {
      const targetPractice = patientData.primaryPractice || 'aesthetic';
      const customNum = patientData.memberships?.[0]?.physicalFileNumber;

      const created = await patientsApi.createPatient({
        ...patientData,
        primaryPractice: targetPractice,
        customFileNumber: customNum
      });

      setPatients(prev => [created, ...prev.filter(p => p.id !== created.id)]);
      return created;
    } catch (err: any) {
      console.error('Failed to add patient:', err);
      alert(err.message || 'خطا در تشکیل پرونده الکترونیک بیمار');
      throw err;
    }
  };

  const addExpense = async (expenseData: Omit<ClinicExpense, 'id'>) => {
    try {
      await financeApi.createExpense(expenseData);
      const freshExps = await financeApi.getExpenses();
      setExpenses(freshExps);
    } catch (err: any) {
      console.error('Failed to add expense:', err);
      alert(err.message || 'خطا در ثبت هزینه');
    }
  };

  const updateGlobalShifts = async (shifts: GlobalShiftsConfig) => {
    try {
      const updated = await settingsApi.updateGlobalShifts(shifts);
      setGlobalShifts(updated);
    } catch (err: any) {
      console.error('Failed to update global shifts:', err);
      alert(err.message || 'خطا در ذخیره ساعات شیفت‌ها');
    }
  };

  const updateExpenseCategories = async (categories: ExpenseCategory[]) => {
    try {
      const updated = await settingsApi.updateExpenseCategories(categories);
      setExpenseCategories(updated);
    } catch (err: any) {
      console.error('Failed to update expense categories:', err);
      alert(err.message || 'خطا در ذخیره دسته‌بندی‌های هزینه');
    }
  };

  const addService = async (serviceData: Omit<ServiceItem, 'id'>) => {
    try {
      const created = await servicesApi.createService(serviceData);
      setServices(prev => [...prev, created]);
    } catch (err: any) {
      console.error('Failed to add service:', err);
      alert(err.message || 'خطا در تعریف خدمت جدید');
    }
  };

  const updateService = async (id: string, updatedData: Partial<ServiceItem>) => {
    try {
      const updated = await servicesApi.updateService(id, updatedData);
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    } catch (err: any) {
      console.error('Failed to update service:', err);
      alert(err.message || 'خطا در ویرایش خدمت');
    }
  };

  const toggleServiceActive = async (id: string) => {
    const target = services.find(s => s.id === id);
    if (!target) return;
    try {
      const updated = await servicesApi.updateService(id, { active: !target.active });
      setServices(prev => prev.map(s => s.id === id ? { ...s, active: updated.active } : s));
    } catch (err: any) {
      console.error('Failed to toggle service active status:', err);
      alert(err.message || 'خطا در تغییر وضعیت خدمت');
    }
  };


  const updateDoctorSchedule = async (doctorId: string, schedule: DoctorDaySchedule[]) => {
    try {
      const updatedSched = await doctorsApi.updateDoctorSchedule(doctorId, schedule);
      setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, weeklySchedule: updatedSched } : d));
    } catch (err: any) {
      console.error('Failed to update doctor schedule:', err);
      alert(err.message || 'خطا در ذخیره برنامه کاری پزشک');
    }
  };

  const addPaymentAccount = async (accountData: Omit<PaymentAccount, 'id'>) => {
    try {
      const created = await paymentAccountsApi.createPaymentAccount(accountData);
      setPaymentAccounts(prev => [...prev, created]);
    } catch (err: any) {
      console.error('Failed to add payment account:', err);
      alert(err.message || 'خطا در افزودن حساب بانکی');
    }
  };

  const updatePaymentAccount = async (id: string, accountData: Omit<PaymentAccount, 'id'>) => {
    try {
      const updated = await paymentAccountsApi.updatePaymentAccount(id, accountData);
      setPaymentAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...updated } : acc));
    } catch (err: any) {
      console.error('Failed to update payment account:', err);
      alert(err.message || 'خطا در ویرایش حساب بانکی');
    }
  };

  const getPracticePaymentAccounts = (practice: 'aesthetic' | 'dental'): string[] => {
    const matched = paymentAccounts.filter(acc => acc.practice === practice).map(acc => acc.name);
    if (matched.length > 0) return matched;
    return PRACTICE_PAYMENT_ACCOUNTS[practice] || [];
  };

  const refreshPatients = async () => {
    try {
      const patsData = await patientsApi.getPatients();
      if (Array.isArray(patsData)) {
        setPatients(patsData);
        if (selectedPatient) {
          const freshSelected = patsData.find(p => p.id === selectedPatient.id);
          if (freshSelected) {
            setSelectedPatient(freshSelected);
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh patients:', err);
    }
  };

  const mergePatients = async (patientAId: string, patientBId: string, primaryPatientId: string): Promise<Patient> => {
    try {
      const mergedPatient = await patientsApi.mergePatients({
        patientAId,
        patientBId,
        primaryPatientId
      });

      const [patsData, aptsData, trxsData, tasksData] = await Promise.all([
        patientsApi.getPatients().catch(() => null),
        appointmentsApi.getAppointments().catch(() => null),
        financeApi.getTransactions().catch(() => null),
        followUpsApi.getTasks().catch(() => null)
      ]);

      if (Array.isArray(patsData)) setPatients(patsData);
      if (Array.isArray(aptsData)) setAppointments(aptsData);
      if (Array.isArray(trxsData)) setTransactions(trxsData);
      if (Array.isArray(tasksData)) setFollowUps(tasksData);

      setSelectedPatient(mergedPatient);
      return mergedPatient;
    } catch (err: any) {
      console.error('Failed to merge patients:', err);
      alert(err.message || 'خطا در ادغام پرونده‌های بیمار');
      throw err;
    }
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
        updateGlobalShifts,
        expenseCategories,
        updateExpenseCategories,

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
        createTask,
        addPatient,
        addExpense,
        addService,
        updateService,
        toggleServiceActive,
        createdIncompletePatientModal,
        setCreatedIncompletePatientModal,
        markPatientProfileCompleted,
        refreshPatients,
        mergePatients
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

