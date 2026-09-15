import { request } from './httpClient';
import type { FollowUpTask, FollowUpStatus } from '../../types';

export interface FollowUpQueryParams {
  practice?: string;
  status?: string;
  dueDate?: string;
  patientId?: string;
  type?: string;
}

export const followUpsApi = {
  getTasks: async (params?: FollowUpQueryParams): Promise<FollowUpTask[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.dueDate) searchParams.append('dueDate', params.dueDate);
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.type) searchParams.append('type', params.type);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<FollowUpTask[]>(`/api/tasks${query}`, {
      method: 'GET'
    });
  },

  getActionCenter: async (params?: { practice?: string; status?: string }): Promise<any[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<any[]>(`/api/tasks/action-center${query}`, {
      method: 'GET'
    });
  },

  createTask: async (taskData: Omit<FollowUpTask, 'id'> & { id?: string; title?: string }): Promise<FollowUpTask> => {
    return request<FollowUpTask>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  updateTask: async (id: string, updatedData: Partial<FollowUpTask>): Promise<FollowUpTask> => {
    return request<FollowUpTask>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData)
    });
  },

  updateTaskStatus: async (id: string, status: FollowUpStatus, resultNote?: string): Promise<FollowUpTask> => {
    return request<FollowUpTask>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resultNote })
    });
  }
};
