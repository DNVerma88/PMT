import { api } from './api';

export interface LeaveRecord {
  id: string;
  userId: string;
  projectId?: string;
  teamId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  notes?: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  project?: { id: string; name: string; code: string };
  team?: { id: string; name: string };
}

export interface CreateLeavePayload {
  userId: string;
  projectId?: string;
  teamId?: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  notes?: string;
}

export interface LeaveQuery {
  userId?: string;
  projectId?: string;
  teamId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const leavesService = {
  create: (payload: CreateLeavePayload) =>
    api.post<LeaveRecord>('/leaves', payload).then((r) => r.data),

  getAll: (query?: LeaveQuery) =>
    api.get<LeaveRecord[]>('/leaves', { params: query }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<LeaveRecord>(`/leaves/${id}`).then((r) => r.data),

  update: (id: string, payload: Partial<CreateLeavePayload>) =>
    api.patch<LeaveRecord>(`/leaves/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/leaves/${id}`),
};

export default leavesService;
