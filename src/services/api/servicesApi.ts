import { request } from './httpClient';
import type { ServiceItem } from '../../types';

export const servicesApi = {
  getServices: async (practice?: 'aesthetic' | 'dental', active?: boolean): Promise<ServiceItem[]> => {
    const params = new URLSearchParams();
    if (practice) params.append('practice', practice);
    if (active !== undefined) params.append('active', String(active));
    const query = params.toString() ? `?${params.toString()}` : '';

    return request<ServiceItem[]>(`/api/services${query}`, {
      method: 'GET'
    });
  },

  createService: async (serviceData: Omit<ServiceItem, 'id'>): Promise<ServiceItem> => {
    return request<ServiceItem>('/api/services', {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
  },

  updateService: async (id: string, updatedData: Partial<ServiceItem>): Promise<ServiceItem> => {
    return request<ServiceItem>(`/api/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData)
    });
  }
};
