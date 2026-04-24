import api from './api';

export const productivityService = {
  getMetricDefs: () =>
    api.get('/productivity/metric-definitions').then((r) => r.data),

  createRecord: (data: any) =>
    api.post('/productivity/records', data).then((r) => r.data),

  getRecords: (params?: any) =>
    api.get('/productivity/records', { params }).then((r) => r.data),

  updateRecord: (id: string, data: any) =>
    api.patch(`/productivity/records/${id}`, data).then((r) => r.data),

  deleteRecord: (id: string) =>
    api.delete(`/productivity/records/${id}`),

  getVelocityTrend: (params?: { projectId?: string; teamId?: string; metricKey?: string; sprintCount?: number }) =>
    api.get('/productivity/analytics/velocity', { params }).then((r) => r.data),

  getWorkTypeBreakdown: (params?: { projectId?: string; teamId?: string; periodFrom?: string; periodTo?: string }) =>
    api.get('/productivity/analytics/work-type-breakdown', { params }).then((r) => r.data),
};
