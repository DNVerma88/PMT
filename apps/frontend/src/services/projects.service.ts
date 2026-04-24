import api from './api';

export interface ProjectMember {
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  headcountPastMonths: number;
  headcountFutureMonths: number;
  _count?: { members: number; teams?: number; releasePlans?: number };
  members?: ProjectMember[];
}

export interface CreateProjectPayload {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  headcountPastMonths?: number;
  headcountFutureMonths?: number;
}

export const projectsService = {
  getAll: () => api.get<Project[]>('/projects').then((r) => r.data),

  getMy: () => api.get<Project[]>('/projects/my').then((r) => r.data),

  getOne: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (data: CreateProjectPayload) =>
    api.post<Project>('/projects', data).then((r) => r.data),

  update: (id: string, data: UpdateProjectPayload) =>
    api.patch<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/projects/${id}`),

  getMembers: (id: string) =>
    api.get<ProjectMember[]>(`/projects/${id}/members`).then((r) => r.data),

  addMember: (id: string, userId: string, role = 'MEMBER') =>
    api.post(`/projects/${id}/members`, { userId, role }).then((r) => r.data),

  updateMemberRole: (id: string, userId: string, role: string) =>
    api.patch(`/projects/${id}/members/${userId}`, { role }).then((r) => r.data),

  removeMember: (id: string, userId: string) =>
    api.delete(`/projects/${id}/members/${userId}`),
};
