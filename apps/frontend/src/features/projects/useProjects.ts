import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../services/projects.service';

const PROJECTS_KEY = ['projects'] as const;
const ALL_USERS_KEY = ['users', 'all'] as const;

export function useAllProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: projectsService.getAll,
  });
}

export function useAllUsers() {
  // Reuse the admin users list if available; falls back to empty
  return useQuery({
    queryKey: ALL_USERS_KEY,
    queryFn: async () => {
      const api = (await import('../../services/api')).default;
      // GET /users returns PaginatedResponse<UserResponseDto>: { data: [...], total, page, limit }
      const r = await api.get('/users', { params: { limit: 500 } });
      const payload = r.data;
      type UserRow = { id: string; firstName: string; lastName: string; email: string; status: string };
      if (Array.isArray(payload)) return payload as UserRow[];
      if (payload && Array.isArray(payload.data)) return payload.data as UserRow[];
      return [] as UserRow[];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectsService.update>[1] }) =>
      projectsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useAddProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      projectsService.addMember(projectId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useRemoveProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      projectsService.removeMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      projectsService.updateMemberRole(projectId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

// Expose useState for convenience
export { useState };
