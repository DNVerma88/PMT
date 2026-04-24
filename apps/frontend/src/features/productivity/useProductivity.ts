import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productivityService } from '../../services/productivity.service';

export const PRODUCTIVITY_KEYS = {
  all: ['productivity'] as const,
  metricDefs: () => [...PRODUCTIVITY_KEYS.all, 'metric-defs'] as const,
  records: (params?: any) => [...PRODUCTIVITY_KEYS.all, 'records', params] as const,
  velocity: (params?: any) => [...PRODUCTIVITY_KEYS.all, 'velocity', params] as const,
  workType: (params?: any) => [...PRODUCTIVITY_KEYS.all, 'work-type', params] as const,
};

export function useMetricDefs() {
  return useQuery({
    queryKey: PRODUCTIVITY_KEYS.metricDefs(),
    queryFn: productivityService.getMetricDefs,
  });
}

export function useProductivityRecords(params?: any) {
  return useQuery({
    queryKey: PRODUCTIVITY_KEYS.records(params),
    queryFn: () => productivityService.getRecords(params),
  });
}

export function useVelocityTrend(params?: { projectId?: string; teamId?: string; metricKey?: string; sprintCount?: number }) {
  return useQuery({
    queryKey: PRODUCTIVITY_KEYS.velocity(params),
    queryFn: () => productivityService.getVelocityTrend(params),
  });
}

export function useWorkTypeBreakdown(params?: { projectId?: string; teamId?: string; periodFrom?: string; periodTo?: string }) {
  return useQuery({
    queryKey: PRODUCTIVITY_KEYS.workType(params),
    queryFn: () => productivityService.getWorkTypeBreakdown(params),
  });
}

export function useCreateProductivityRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productivityService.createRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTIVITY_KEYS.all }),
  });
}

export function useUpdateProductivityRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productivityService.updateRecord(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTIVITY_KEYS.all }),
  });
}
