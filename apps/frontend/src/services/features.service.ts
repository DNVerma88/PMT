import { api } from './api';

export interface FeatureDto {
  id: string;
  name: string;
  description?: string | null;
  projectId?: string | null;
  teamId?: string | null;
  category?: string | null;
  sortOrder: number;
  status: string;
  releasePlanId?: string | null;
  sprintCalendarId?: string | null;
  phase1Label: string;
  phase1StartSprint?: number | null;
  phase1EndSprint?: number | null;
  phase1Color: string;
  phase2Label: string;
  phase2StartSprint?: number | null;
  phase2EndSprint?: number | null;
  phase2Color: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // joined
  team?: { id: string; name: string } | null;
  releasePlan?: { id: string; name: string; version: string } | null;
  sprintCalendar?: { id: string; name: string } | null;
  teamName?: string | null;
  releasePlanName?: string | null;
}

export interface SprintDto {
  id: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface MonthGroup {
  label: string;
  year: number;
  month: number;
  sprintNumbers: number[];
}

export interface TimelineData {
  sprints: SprintDto[];
  months: MonthGroup[];
  features: FeatureDto[];
}

export interface CreateFeaturePayload {
  name: string;
  description?: string;
  projectId?: string;
  teamId?: string;
  category?: string;
  sortOrder?: number;
  status?: string;
  releasePlanId?: string;
  sprintCalendarId?: string;
  phase1Label?: string;
  phase1StartSprint?: number;
  phase1EndSprint?: number;
  phase1Color?: string;
  phase2Label?: string;
  phase2StartSprint?: number;
  phase2EndSprint?: number;
  phase2Color?: string;
}

export const featuresService = {
  getFeatures: (params?: { projectId?: string; sprintCalendarId?: string }) =>
    api.get<FeatureDto[]>('/features', { params }).then((r) => r.data),

  getTimeline: (params: { sprintCalendarId: string; projectId?: string }) =>
    api.get<TimelineData>('/features/timeline', { params }).then((r) => r.data),

  createFeature: (data: CreateFeaturePayload) =>
    api.post<FeatureDto>('/features', data).then((r) => r.data),

  updateFeature: (id: string, data: Partial<CreateFeaturePayload>) =>
    api.patch<FeatureDto>(`/features/${id}`, data).then((r) => r.data),

  deleteFeature: (id: string) => api.delete(`/features/${id}`),
};
