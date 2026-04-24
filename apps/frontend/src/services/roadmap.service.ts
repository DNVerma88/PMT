import api from './api';

export const roadmapService = {
  getGantt: (params?: { projectId?: string; startDate?: string; endDate?: string; status?: string }) =>
    api.get('/roadmap/gantt', { params }).then((r) => r.data),

  getSummary: (projectId?: string) =>
    api.get('/roadmap/summary', { params: projectId ? { projectId } : {} }).then((r) => r.data),
};
