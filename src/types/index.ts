export type ClinicScope = 'unified' | 'aesthetic' | 'dental';

export type UserRole = 'receptionist' | 'admin_doctor';

export type AppointmentStatus = 'pending' | 'checked_in' | 'completed' | 'canceled' | 'unsettled';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type FollowUpStatus = 'pending' | 'called_no_answer' | 'called_confirmed' | 'rescheduled' | 'completed';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  practice: 'aesthetic' | 'dental';
  phone: string;
  avatar: string;
  workingHours: string;
  color: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  code: string;
  practice: 'aesthetic' | 'dental';
  price: number; // In Tomans
  duration: number; // minutes
  description?: string;
  active: boolean;
}

export interface Patient {
  id: string;
  fileNumber: string; // e.g. CL-1001
  nationalId: string;
  name: string;
  mobile: string;
  gender: 'female' | 'male';
  birthDate?: string;
  primaryPractice: 'aesthetic' | 'dental';
  allergies: string[];
  medicalNotes: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  balance: number; // positive = prepayment (بستانکار), negative = debt (بدهکار), 0 = settled
  createdAt: string;
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
  date: string; // YYYY-MM-DD (Jalali format e.g. 1405-06-16)
  timeSlot: string; // e.g. 10:30
  duration: number; // mins
  status: AppointmentStatus;
  notes?: string;
  serviceId?: string;
  serviceName?: string;
  cabinetNumber?: string;
}

export interface OnlineRequest {
  id: string;
  patientName: string;
  mobile: string;
  nationalId?: string;
  targetPractice: 'aesthetic' | 'dental';
  doctorId: string;
  doctorName: string;
  requestedDate: string;
  requestedTimeSlot: string;
  notes?: string;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  patientId: string;
  patientName: string;
  fileNumber: string;
  appointmentId?: string;
  practice: 'aesthetic' | 'dental';
  date: string; // Jalali YYYY-MM-DD
  serviceName: string;
  totalCost: number; // Tomans
  discount: number; // Tomans
  netCost: number; // totalCost - discount
  paidAmount: number;
  remainingDebt: number;
  paymentMethod: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
  posAccount: string; // Bank account label
  debtDueDate?: string; // Jalali YYYY-MM-DD if remainingDebt > 0
  isRetroactive?: boolean;
  notes?: string;
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
