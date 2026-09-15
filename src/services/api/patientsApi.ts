import { request } from './httpClient';
import type { Patient } from '../../types';

export interface PatientQueryParams {
  practice?: 'aesthetic' | 'dental';
  searchQuery?: string;
  profileStatus?: 'completed' | 'incomplete';
}

export const patientsApi = {
  getPatients: async (params?: PatientQueryParams): Promise<Patient[]> => {
    const searchParams = new URLSearchParams();
    if (params?.practice) searchParams.append('practice', params.practice);
    if (params?.searchQuery) searchParams.append('searchQuery', params.searchQuery);
    if (params?.profileStatus) searchParams.append('profileStatus', params.profileStatus);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Patient[]>(`/api/patients${query}`, {
      method: 'GET'
    });
  },

  getPatientById: async (id: string): Promise<Patient> => {
    return request<Patient>(`/api/patients/${id}`, {
      method: 'GET'
    });
  },

  createPatient: async (patientData: Omit<Patient, 'id' | 'fileNumber' | 'createdAt' | 'balance'> & { customFileNumber?: string }): Promise<Patient> => {
    return request<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  },

  updatePatient: async (id: string, updatedData: Partial<Patient>): Promise<Patient> => {
    return request<Patient>(`/api/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData)
    });
  },

  addPatientMembership: async (patientId: string, practice: 'aesthetic' | 'dental', customFileNumber?: string): Promise<Patient> => {
    return request<Patient>(`/api/patients/${patientId}/memberships`, {
      method: 'POST',
      body: JSON.stringify({ practice, customFileNumber })
    });
  },

  updatePhysicalFileNumber: async (patientId: string, practice: 'aesthetic' | 'dental', newFileNumber: string): Promise<Patient> => {
    return request<Patient>(`/api/patients/${patientId}/memberships/${practice}`, {
      method: 'PATCH',
      body: JSON.stringify({ physicalFileNumber: newFileNumber })
    });
  }
};
