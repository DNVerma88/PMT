import { api } from './api';

export type ExportReportType = 'roadmap' | 'headcount' | 'productivity' | 'release';
export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';
export type ExportStatus = 'PENDING' | 'READY' | 'FAILED';

export interface CreateExportPayload {
  reportType: ExportReportType;
  format: ExportFormat;
  projectId?: string;
  releaseId?: string;
  from?: string;
  to?: string;
}

export interface ExportJob {
  id: string;
  status: ExportStatus;
  reportType: ExportReportType;
  format: ExportFormat;
  fileName?: string;
  errorMsg?: string;
  createdAt: string;
  readyAt?: string;
}

const exportsService = {
  create: (payload: CreateExportPayload) =>
    api.post<{ jobId: string; status: ExportStatus }>('/exports', payload).then((r) => r.data),

  getStatus: (jobId: string) =>
    api.get<ExportJob>(`/exports/${jobId}/status`).then((r) => r.data),

  getHistory: () =>
    api.get<ExportJob[]>('/exports/history').then((r) => r.data),

  download: (jobId: string) =>
    api.get(`/exports/${jobId}/download`, { responseType: 'blob' }).then((r) => r.data as Blob),
};

export default exportsService;
