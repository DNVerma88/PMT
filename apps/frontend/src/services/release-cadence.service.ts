import api from './api';

// ── Sprint Calendars ────────────────────────────────────────────────────────

export const releaseCadenceService = {
  // Sprint Calendars
  createSprintCalendar: (data: any) =>
    api.post('/release-cadence/sprint-calendars', data).then((r) => r.data),

  getSprintCalendars: (projectId?: string) =>
    api
      .get('/release-cadence/sprint-calendars', { params: projectId ? { projectId } : {} })
      .then((r) => r.data),

  getSprintCalendar: (id: string) =>
    api.get(`/release-cadence/sprint-calendars/${id}`).then((r) => r.data),

  extendSprintCalendar: (id: string, count: number) =>
    api.post(`/release-cadence/sprint-calendars/${id}/extend`, { count }).then((r) => r.data),

  // Release Plans
  createReleasePlan: (data: any) =>
    api.post('/release-cadence/release-plans', data).then((r) => r.data),

  getReleasePlans: (params?: { projectId?: string; type?: string; status?: string }) =>
    api.get('/release-cadence/release-plans', { params }).then((r) => r.data),

  getReleasePlan: (id: string) =>
    api.get(`/release-cadence/release-plans/${id}`).then((r) => r.data),

  updateReleasePlan: (id: string, data: any) =>
    api.patch(`/release-cadence/release-plans/${id}`, data).then((r) => r.data),

  deleteReleasePlan: (id: string) =>
    api.delete(`/release-cadence/release-plans/${id}`),

  getGanttData: (params?: { projectId?: string; startDate?: string; endDate?: string }) =>
    api.get('/release-cadence/release-plans/gantt', { params }).then((r) => r.data),

  // Milestones
  createMilestone: (data: any) =>
    api.post('/release-cadence/milestones', data).then((r) => r.data),

  updateMilestone: (id: string, data: any) =>
    api.patch(`/release-cadence/milestones/${id}`, data).then((r) => r.data),

  deleteMilestone: (id: string) =>
    api.delete(`/release-cadence/milestones/${id}`),
};
