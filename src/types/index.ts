export type ClinicScope = 'unified' | 'aesthetic' | 'dental';

export type UserRole = 'receptionist' | 'admin_doctor';

export type AppointmentStatus = 'pending' | 'checked_in' | 'completed' | 'canceled' | 'rescheduled' | 'unsettled';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type FollowUpStatus = 'pending' | 'called_no_answer' | 'called_confirmed' | 'rescheduled' | 'completed';

export type PresenceStatus = 'present' | 'absent' | 'pending';

export interface ShiftHoursConfig {
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "14:00"
}

export interface GlobalShiftsConfig {
  morning: ShiftHoursConfig;
  evening: ShiftHoursConfig;
}

export type DayOfWeekPersian = 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه';

export interface DoctorDaySchedule {
  day: DayOfWeekPersian;
  morningActive: boolean;
  eveningActive: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  practice: 'aesthetic' | 'dental';
  phone: string;
  avatar: string;
  workingHours: string;
  color: string;
  weeklySchedule?: DoctorDaySchedule[];
}

export interface PaymentAccount {
  id: string;
  name: string;
  practice: 'aesthetic' | 'dental';
}

export interface ServiceItem {
  id: string;
  name: string;
  code: string;
  practice: 'aesthetic' | 'dental';
  price: number; // In Tomans
  duration: number; // minutes
  description?: string;
  defaultPaymentTermDays?: number;
  active: boolean;
}

export type PracticeType = 'aesthetic' | 'dental';

export interface PracticeMembership {
  practice: PracticeType;
  physicalFileNumber: string;
  joinedAt?: string;
}

export interface Patient {
  id: string;
  fileNumber?: string; // legacy/fallback display string
  nationalId?: string;
  name: string;
  mobile: string;
  gender?: 'female' | 'male';
  birthDate?: string;
  primaryPractice?: PracticeType; // legacy display indicator
  memberships: PracticeMembership[]; // source of truth for practice membership and file numbers
  allergies?: string[];
  medicalNotes?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  balance: number; // positive = prepayment (بستانکار), negative = debt (بدهکار), 0 = settled
  createdAt: string;
  profileStatus?: 'incomplete' | 'completed';
  loginCredentials?: {
    username: string;
    password?: string;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  fileNumber: string;
  doctorId: string;
  doctorName: string;
  practice: 'aesthetic' | 'dental';
  date: string; // YYYY-MM-DD (Jalali format e.g. ۱۴۰۵-۰۶-۱۶)
  timeSlot: string; // e.g. ۱۰:۳۰
  duration: number; // mins
  status: AppointmentStatus;
  presenceStatus?: PresenceStatus;
  notes?: string;
  serviceId?: string;
  serviceName?: string;
  cabinetNumber?: string;
  cancellationReason?: string;
  cancellationType?: 'rescheduled' | 'no_replacement';
  canceledAt?: string;
  previousAppointmentId?: string;
  replacementAppointmentId?: string;
}

export type OnlineRequestType = 'visit' | 'consultation';

export interface OnlineRequest {
  id: string;
  patientName: string;
  mobile: string;
  nationalId?: string;
  targetPractice: 'aesthetic' | 'dental';
  doctorId: string;
  doctorName: string;
  requestType?: OnlineRequestType;
  proposedDates?: string[]; // Up to 3 suggested dates
  requestedDate: string;
  requestedTimeSlot: string;
  notes?: string;
  status: RequestStatus;
  rejectionReason?: string;
  rejectedAt?: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  appointmentId?: string;
  practice: 'aesthetic' | 'dental';
  date: string; // Jalali YYYY-MM-DD (recordDate)
  serviceDate?: string; // Jalali YYYY-MM-DD (serviceDate - date treatment rendered)
  timestamp?: string; // Time e.g. ۱۴:۳۰
  serviceName: string;
  totalCost: number; // Tomans
  discount: number; // Tomans
  netCost: number; // totalCost - discount
  paidAmount: number;
  remainingDebt: number;
  paymentMethod: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
  posAccount: string; // Bank account label
  debtDueDate?: string; // Jalali YYYY-MM-DD (dueDate) if remainingDebt > 0
  lastActionDate?: string; // Jalali YYYY-MM-DD of last debt review/payment
  isRetroactive?: boolean;
  notes?: string;
  trxType?: 'service' | 'payment';
  obligationId?: string;
}

export interface FollowUpTask {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  fileNumber: string;
  doctorId: string;
  doctorName: string;
  practice: 'aesthetic' | 'dental';
  type: 'post_op' | 'lab_result' | 'checkup' | 'debt_reminder';
  description: string;
  dueDate: string; // Jalali YYYY-MM-DD
  status: FollowUpStatus;
  resultNote?: string;
  updatedAt?: string;
}

export interface ClinicExpense {
  id: string;
  title: string;
  category: 'consumables' | 'rent' | 'salaries' | 'equipment' | 'utilities' | 'other';
  amount: number; // Tomans
  date: string; // Jalali YYYY-MM-DD
  practice: 'aesthetic' | 'dental' | 'unified';
  recordedBy: string;
  description?: string;
  receiptNumber?: string;
}

export type ImportCategory = 'ready' | 'missing_name' | 'missing_pc' | 'invalid_phone' | 'duplicate';

export interface ImportBatch {
  id: string;
  fileName: string;
  practice: 'aesthetic' | 'dental';
  createdAt: string;
  status: 'preview' | 'committed' | 'discarded';
  totalRecords: number;
  validCount: number;
  missingNameCount: number;
  missingPcCount: number;
  invalidPhoneCount: number;
  duplicateCount: number;
}

export interface ImportRecord {
  id: string;
  batchId: string;
  excelRowNumber: number;
  practice: 'aesthetic' | 'dental';
  rawPc?: string | null;
  rawName?: string | null;
  rawPhone?: string | null;
  normalizedPc?: string | null;
  normalizedName?: string | null;
  normalizedPhone?: string | null;
  category: ImportCategory;
  issues: string[];
  duplicateTargetPatientId?: string | null;
  duplicateTargetRecordId?: string | null;
  duplicateReason?: string | null;
  duplicateResolution: 'unresolved' | 'merged_same_person' | 'separate_different_person' | 'ignored';
  importedPatientId?: string | null;
  status: 'staged' | 'committed' | 'ignored';
  matchedPatient?: {
    id: string;
    name: string;
    mobile: string;
    fileNumber?: string;
    memberships: PracticeMembership[];
  } | null;
}

