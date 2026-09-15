import { request } from './httpClient';
import type { OnlineRequest } from '../../types';

export interface OnlineRequestQueryParams {
  practice?: string;
  status?: string;
}

export const onlineRequestsApi = {
  getRequests: async (params?: OnlineRequestQueryParams): Promise<OnlineRequest[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<OnlineRequest[]>(`/api/online-requests${query}`, {
      method: 'GET'
    });
  },

  getRequestById: async (id: string): Promise<OnlineRequest> => {
    return request<OnlineRequest>(`/api/online-requests/${id}`, {
      method: 'GET'
    });
  },

  approveRequest: async (
    id: string,
    data?: {
      confirmedDate?: string;
      timeSlot?: string;
      doctorId?: string;
      customMessage?: string;
    }
  ): Promise<{ request: OnlineRequest; appointmentId: string }> => {
    return request<{ request: OnlineRequest; appointmentId: string }>(`/api/online-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },

  rejectRequest: async (id: string, rejectionReason: string): Promise<OnlineRequest> => {
    return request<OnlineRequest>(`/api/online-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'rejected',
        rejectionReason
      })
    });
  }
};
