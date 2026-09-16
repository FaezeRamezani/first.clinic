import { request } from './httpClient';
import type { ImportBatch, ImportRecord } from '../../types';

export interface UploadImportPayload {
  practice: 'aesthetic' | 'dental';
  fileName: string;
  fileBase64: string;
}

export interface BatchDetailsResponse {
  batch: ImportBatch;
  records: ImportRecord[];
}

export interface CommitResponse {
  importedPatientsCount: number;
  updatedMembershipsCount: number;
  message: string;
}

export const importApi = {
  // Get all batches
  getBatches: async (): Promise<ImportBatch[]> => {
    return request<ImportBatch[]>('/api/import/batches');
  },

  // Get batch details & staging records
  getBatchDetails: async (batchId: string): Promise<BatchDetailsResponse> => {
    return request<BatchDetailsResponse>(`/api/import/batches/${batchId}`);
  },

  // Upload Excel file (Base64)
  uploadExcel: async (payload: UploadImportPayload): Promise<{ batch: ImportBatch; summary: any }> => {
    return request<{ batch: ImportBatch; summary: any }>('/api/import/upload', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Upload Excel File FormData
  uploadExcelFile: async (file: File, practice: 'aesthetic' | 'dental'): Promise<{ batch: ImportBatch; summary: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('practice', practice);

    const res = await fetch('http://127.0.0.1:3000/api/import/upload', {
      method: 'POST',
      body: formData
    });
    const body = await res.json();
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || 'خطا در آپلود فایل اکسل');
    }
    return body.data;
  },

  // Update single staging record
  updateRecord: async (recordId: string, updates: { rawPc?: string; rawName?: string; rawPhone?: string }): Promise<ImportRecord> => {
    return request<ImportRecord>(`/api/import/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  // Resolve duplicate decision
  resolveDuplicate: async (
    recordId: string,
    resolution: 'merged_same_person' | 'separate_different_person' | 'ignored',
    targetPatientId?: string
  ): Promise<ImportRecord> => {
    return request<ImportRecord>(`/api/import/records/${recordId}/resolve-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ resolution, targetPatientId })
    });
  },

  // Commit batch
  commitBatch: async (batchId: string): Promise<CommitResponse> => {
    return request<CommitResponse>(`/api/import/batches/${batchId}/commit`, {
      method: 'POST'
    });
  },

  // Delete/Discard batch
  deleteBatch: async (batchId: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/api/import/batches/${batchId}`, {
      method: 'DELETE'
    });
  }
};
