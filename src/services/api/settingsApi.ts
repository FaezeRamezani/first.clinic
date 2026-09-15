import { request } from './httpClient';
import type { GlobalShiftsConfig } from '../../types';

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
  }
};
