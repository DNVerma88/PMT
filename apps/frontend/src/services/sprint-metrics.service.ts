import { api } from './api';

export interface SprintSnapshot {
  id: string;
  projectId?: string;
  teamId?: string;
  sprintId?: string;
  sprintName?: string;
  snapshotDate: string;
  storyStateCounts: Record<string, number>;
  bugStateCounts: Record<string, number>;
  bugCountAtSprintStart?: number;
  notes?: string;
  createdAt: string;
  project?: { id: string; name: string; code: string };
  team?: { id: string; name: string };
  sprint?: { id: string; name: string; number: number };
}

export interface CreateSnapshotPayload {
  projectId?: string;
  teamId?: string;
  sprintId?: string;
  snapshotDate: string;
  sprintName?: string;
  storyStateCounts: Record<string, number>;
  bugStateCounts: Record<string, number>;
  bugCountAtSprintStart?: number;
  notes?: string;
}

export interface SnapshotQuery {
  projectId?: string;
  teamId?: string;
  sprintId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const sprintMetricsService = {
  create: (payload: CreateSnapshotPayload) =>
    api.post<SprintSnapshot>('/sprint-metrics', payload).then((r) => r.data),

  getAll: (query?: SnapshotQuery) =>
    api.get<{ items: SprintSnapshot[]; total: number; page: number; limit: number }>('/sprint-metrics', { params: query }).then((r) => r.data),

  getLatest: (projectId?: string, teamId?: string) =>
    api.get<SprintSnapshot | null>('/sprint-metrics/latest', { params: { projectId, teamId } }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<SprintSnapshot>(`/sprint-metrics/${id}`).then((r) => r.data),

  update: (id: string, payload: Partial<CreateSnapshotPayload>) =>
    api.patch<SprintSnapshot>(`/sprint-metrics/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/sprint-metrics/${id}`),
};

export default sprintMetricsService;
