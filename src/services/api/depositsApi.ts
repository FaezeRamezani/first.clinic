import { request } from './httpClient';
import type { Deposit, PracticeType, DepositStatus } from '../../types';

export interface DepositQueryParams {
  practice?: PracticeType | 'unified';
  patientId?: string;
  status?: DepositStatus;
}

export interface CreateDepositDto {
  patientId: string;
  practice: PracticeType;
  serviceId?: string | null;
  appointmentId?: string | null;
  newAppointment?: {
    date: string;
    timeSlot: string;
    duration?: number;
    cabinetNumber?: string | null;
    notes?: string | null;
  } | null;
  amount: number;
  paymentDate?: string;
  paymentMethod: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
  paymentAccountId?: string | null;
  posAccount?: string | null;
  notes?: string | null;
}

export interface UpdateDepositDto {
  serviceId?: string | null;
  appointmentId?: string | null;
  newAppointment?: {
    date: string;
    timeSlot: string;
    duration?: number;
    cabinetNumber?: string | null;
    notes?: string | null;
  } | null;
  notes?: string | null;
}

export interface AdjustDepositAmountDto {
  newAmount: number;
  paymentMethod?: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
  paymentAccountId?: string | null;
  posAccount?: string | null;
  notes?: string | null;
}

export interface RefundDepositDto {
  refundAmount?: number;
  paymentMethod: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
  paymentAccountId?: string | null;
  posAccount: string;
  reason?: string | null;
}

export interface ApplyDepositDto {
  obligationId: string;
  amount?: number;
}

export const depositsApi = {
  getDeposits: async (params?: DepositQueryParams): Promise<Deposit[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice && params.practice !== 'unified') searchParams.append('practice', params.practice);
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Deposit[]>(`/api/deposits${query}`, {
      method: 'GET'
    });
  },

  getDeposit: async (id: string): Promise<Deposit & { linkedReceipts?: any[] }> => {
    return request<Deposit & { linkedReceipts?: any[] }>(`/api/deposits/${id}`, {
      method: 'GET'
    });
  },

  createDeposit: async (data: CreateDepositDto): Promise<Deposit> => {
    return request<Deposit>('/api/deposits', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateDeposit: async (id: string, data: UpdateDepositDto): Promise<Deposit> => {
    return request<Deposit>(`/api/deposits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  adjustAmount: async (id: string, data: AdjustDepositAmountDto): Promise<Deposit> => {
    return request<Deposit>(`/api/deposits/${id}/adjust-amount`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  refundDeposit: async (id: string, data: RefundDepositDto): Promise<Deposit> => {
    return request<Deposit>(`/api/deposits/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  applyDeposit: async (id: string, data: ApplyDepositDto): Promise<Deposit> => {
    return request<Deposit>(`/api/deposits/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
