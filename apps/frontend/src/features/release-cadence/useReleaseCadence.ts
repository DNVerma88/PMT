import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { releaseCadenceService } from '../../services/release-cadence.service';

export const RELEASE_KEYS = {
  all: ['release-cadence'] as const,
  plans: (params?: any) => [...RELEASE_KEYS.all, 'plans', params] as const,
  plan: (id: string) => [...RELEASE_KEYS.all, 'plan', id] as const,
  calendars: (projectId?: string) => [...RELEASE_KEYS.all, 'calendars', projectId] as const,
  gantt: (params?: any) => [...RELEASE_KEYS.all, 'gantt', params] as const,
};

export function useReleasePlans(params?: { projectId?: string; type?: string; status?: string }) {
  return useQuery({
    queryKey: RELEASE_KEYS.plans(params),
    queryFn: () => releaseCadenceService.getReleasePlans(params),
  });
}

export function useReleasePlan(id: string) {
  return useQuery({
    queryKey: RELEASE_KEYS.plan(id),
    queryFn: () => releaseCadenceService.getReleasePlan(id),
    enabled: !!id,
  });
}

export function useSprintCalendars(projectId?: string) {
  return useQuery({
    queryKey: RELEASE_KEYS.calendars(projectId),
    queryFn: () => releaseCadenceService.getSprintCalendars(projectId),
  });
}

export function useReleaseCadenceGantt(params?: { projectId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: RELEASE_KEYS.gantt(params),
    queryFn: () => releaseCadenceService.getGanttData(params),
  });
}

export function useCreateReleasePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: releaseCadenceService.createReleasePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}

export function useUpdateReleasePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      releaseCadenceService.updateReleasePlan(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}

export function useDeleteReleasePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: releaseCadenceService.deleteReleasePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: releaseCadenceService.createMilestone,
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      releaseCadenceService.updateMilestone(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}

export function useCreateSprintCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: releaseCadenceService.createSprintCalendar,
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}

export function useExtendSprintCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) =>
      releaseCadenceService.extendSprintCalendar(id, count),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.all }),
  });
}
