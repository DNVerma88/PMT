import api from './api';

export const dashboardService = {
  getSummary: (projectId?: string) =>
    api.get('/dashboard/summary', { params: projectId ? { projectId } : {} }).then((r) => r.data),
};
