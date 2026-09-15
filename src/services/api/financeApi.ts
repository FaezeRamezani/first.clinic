import { request } from './httpClient';
import type { FinancialTransaction, ClinicExpense } from '../../types';

export interface FinancialSummaryData {
  totalIncome: number;
  totalExpenses: number;
  totalOutstanding: number;
  netBalance: number;
}

export interface FinanceQueryParams {
  practice?: 'aesthetic' | 'dental' | 'unified';
  date?: string;
  patientId?: string;
}

export const financeApi = {
  getSummary: async (params?: FinanceQueryParams): Promise<FinancialSummaryData> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.date) searchParams.append('date', params.date);
    if (params?.patientId) searchParams.append('patientId', params.patientId);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<FinancialSummaryData>(`/api/finance/summary${query}`, {
      method: 'GET'
    });
  },

  getTransactions: async (params?: FinanceQueryParams): Promise<FinancialTransaction[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.patientId) searchParams.append('patientId', params.patientId);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<FinancialTransaction[]>(`/api/finance/transactions${query}`, {
      method: 'GET'
    });
  },

  getObligations: async (params?: FinanceQueryParams & { status?: string; dueDate?: string }): Promise<any[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.dueDate) searchParams.append('dueDate', params.dueDate);
    if (params?.date) searchParams.append('date', params.date);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<any[]>(`/api/finance/obligations${query}`, {
      method: 'GET'
    });
  },

  createObligation: async (data: {
    patientId: string;
    appointmentId?: string;
    serviceId?: string;
    practice: 'aesthetic' | 'dental';
    serviceDate?: string;
    recordDate?: string;
    serviceName: string;
    totalCost: number;
    discount?: number;
    dueDate?: string;
    notes?: string;
    paidAmount?: number;
    paymentMethod?: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
    paymentAccountId?: string;
    posAccount?: string;
  }): Promise<any> => {
    return request<any>('/api/finance/obligations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  recordPayment: async (data: {
    obligationId?: string;
    patientId: string;
    appointmentId?: string;
    practice: 'aesthetic' | 'dental';
    recordDate?: string;
    serviceDate?: string;
    paidAmount: number;
    paymentMethod?: 'cash' | 'pos_aesthetic' | 'pos_dental' | 'card_transfer';
    paymentAccountId?: string;
    posAccount?: string;
    debtDueDate?: string;
    notes?: string;
  }): Promise<any> => {
    return request<any>('/api/finance/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getExpenses: async (practice?: string): Promise<ClinicExpense[]> => {
    const query = practice && practice !== 'unified' ? `?practice=${practice}` : '';
    return request<ClinicExpense[]>(`/api/finance/expenses${query}`, {
      method: 'GET'
    });
  },

  createExpense: async (expenseData: Omit<ClinicExpense, 'id'>): Promise<ClinicExpense> => {
    return request<ClinicExpense>('/api/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
  }
};
