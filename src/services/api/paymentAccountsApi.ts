import { request } from './httpClient';
import type { PaymentAccount } from '../../types';

export const paymentAccountsApi = {
  getPaymentAccounts: async (practice?: 'aesthetic' | 'dental'): Promise<PaymentAccount[]> => {
    const query = practice ? `?practice=${practice}` : '';
    return request<PaymentAccount[]>(`/api/payment-accounts${query}`, {
      method: 'GET'
    });
  },

  createPaymentAccount: async (accountData: Omit<PaymentAccount, 'id'>): Promise<PaymentAccount> => {
    return request<PaymentAccount>('/api/payment-accounts', {
      method: 'POST',
      body: JSON.stringify(accountData)
    });
  },

  updatePaymentAccount: async (id: string, updatedData: Partial<PaymentAccount>): Promise<PaymentAccount> => {
    return request<PaymentAccount>(`/api/payment-accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData)
    });
  }
};
