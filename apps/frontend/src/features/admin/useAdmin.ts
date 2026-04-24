import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

// ── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  permissions: { id: string; resource: string; action: string }[];
}

// ── Keys ─────────────────────────────────────────────────────────────────────
const USERS_KEY = ['admin', 'users'] as const;
const ROLES_KEY = ['admin', 'roles'] as const;

// ── Users ─────────────────────────────────────────────────────────────────────
export function useAdminUsers(search = '') {
  return useQuery({
    queryKey: [...USERS_KEY, search],
    queryFn: async () => {
      const r = await api.get('/users', { params: { limit: 200, search: search || undefined } });
      const payload = r.data;
      if (Array.isArray(payload)) return payload as AdminUser[];
      if (payload?.data) return payload.data as AdminUser[];
      return [] as AdminUser[];
    },
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string; username: string; password: string;
      firstName: string; lastName: string; roleIds?: string[];
    }) => api.post('/users', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export function useAdminRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get('/roles').then((r) => r.data as RoleWithPermissions[]),
  });
}
