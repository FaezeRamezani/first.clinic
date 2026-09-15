import { request } from './httpClient';
import type { Appointment, AppointmentStatus, PresenceStatus } from '../../types';

export interface AppointmentQueryParams {
  date?: string;
  practice?: 'aesthetic' | 'dental';
  doctorId?: string;
  patientId?: string;
  status?: string;
}

export const appointmentsApi = {
  getAppointments: async (params?: AppointmentQueryParams): Promise<Appointment[]> => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.append('date', params.date);
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.doctorId) searchParams.append('doctorId', params.doctorId);
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Appointment[]>(`/api/appointments${query}`, {
      method: 'GET'
    });
  },

  getAppointmentById: async (id: string): Promise<Appointment> => {
    return request<Appointment>(`/api/appointments/${id}`, {
      method: 'GET'
    });
  },

  createAppointment: async (aptData: Omit<Appointment, 'id'> & { id?: string }): Promise<Appointment> => {
    return request<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(aptData)
    });
  },

  updateAppointment: async (id: string, updatedData: Partial<Appointment>): Promise<Appointment> => {
    return request<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData)
    });
  },

  cancelAppointment: async (
    id: string,
    type: 'rescheduled' | 'no_replacement',
    reason?: string
  ): Promise<Appointment> => {
    const newStatus: AppointmentStatus = type === 'rescheduled' ? 'rescheduled' : 'canceled';
    return request<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        cancellationType: type,
        cancellationReason: reason || (type === 'no_replacement' ? 'لغو شده - بدون نوبت جایگزین' : 'تغییر نوبت و تعیین زمان جدید'),
        canceledAt: new Date().toISOString()
      })
    });
  },

  updateAppointmentStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    return request<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  updateAppointmentPresenceStatus: async (
    id: string,
    presenceStatus: PresenceStatus,
    currentStatus?: AppointmentStatus
  ): Promise<Appointment> => {
    const updatedStatus = presenceStatus === 'present' ? 'checked_in' : (currentStatus === 'checked_in' ? 'pending' : currentStatus);
    return request<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        presenceStatus,
        status: updatedStatus
      })
    });
  }
};
