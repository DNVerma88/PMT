import api from './api';

export const headcountService = {
  createRecord: (data: any) =>
    api.post('/headcount/records', data).then((r) => r.data),

  getRecords: (params?: any) =>
    api.get('/headcount/records', { params }).then((r) => r.data),

  updateRecord: (id: string, data: any) =>
    api.patch(`/headcount/records/${id}`, data).then((r) => r.data),

  deleteRecord: (id: string) =>
    api.delete(`/headcount/records/${id}`),

  getSummary: (projectId?: string) =>
    api.get('/headcount/analytics/summary', { params: projectId ? { projectId } : {} }).then((r) => r.data),

  getTimeSeries: (params?: { projectId?: string; teamId?: string; periodFrom?: string; periodTo?: string }) =>
    api.get('/headcount/analytics/time-series', { params }).then((r) => r.data),

  getWaterfall: (params?: { projectId?: string; teamId?: string; periodFrom?: string; periodTo?: string }) =>
    api.get('/headcount/analytics/waterfall', { params }).then((r) => r.data),
};
