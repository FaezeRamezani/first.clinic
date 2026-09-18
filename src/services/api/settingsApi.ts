import { request } from './httpClient';
import type { GlobalShiftsConfig, ExpenseCategory } from '../../types';

export const settingsApi = {
  getGlobalShifts: async (): Promise<GlobalShiftsConfig> => {
    return request<GlobalShiftsConfig>('/api/settings/shifts', {
      method: 'GET'
    });
  },

  updateGlobalShifts: async (shifts: GlobalShiftsConfig): Promise<GlobalShiftsConfig> => {
    return request<GlobalShiftsConfig>('/api/settings/shifts', {
      method: 'PUT',
      body: JSON.stringify(shifts)
    });
  },

  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    return request<ExpenseCategory[]>('/api/settings/expense-categories', {
      method: 'GET'
    });
  },

  updateExpenseCategories: async (categories: ExpenseCategory[]): Promise<ExpenseCategory[]> => {
    return request<ExpenseCategory[]>('/api/settings/expense-categories', {
      method: 'PUT',
      body: JSON.stringify(categories)
    });
  }
};
