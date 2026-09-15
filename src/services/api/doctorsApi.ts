import { request } from './httpClient';
import type { Doctor, DoctorDaySchedule } from '../../types';

export const doctorsApi = {
  getDoctors: async (practice?: 'aesthetic' | 'dental'): Promise<Doctor[]> => {
    const query = practice ? `?practice=${practice}` : '';
    return request<Doctor[]>(`/api/doctors${query}`, {
      method: 'GET'
    });
  },

  getDoctorSchedule: async (doctorId: string): Promise<DoctorDaySchedule[]> => {
    return request<DoctorDaySchedule[]>(`/api/doctors/${doctorId}/schedule`, {
      method: 'GET'
    });
  },

  updateDoctorSchedule: async (doctorId: string, schedule: DoctorDaySchedule[]): Promise<DoctorDaySchedule[]> => {
    return request<DoctorDaySchedule[]>(`/api/doctors/${doctorId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify(schedule)
    });
  }
};
