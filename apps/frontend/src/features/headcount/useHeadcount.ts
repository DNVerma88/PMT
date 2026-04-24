import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { headcountService } from '../../services/headcount.service';

export const HEADCOUNT_KEYS = {
  all: ['headcount'] as const,
  summary: (projectId?: string) => [...HEADCOUNT_KEYS.all, 'summary', projectId] as const,
  records: (params?: any) => [...HEADCOUNT_KEYS.all, 'records', params] as const,
  timeSeries: (params?: any) => [...HEADCOUNT_KEYS.all, 'time-series', params] as const,
  waterfall: (params?: any) => [...HEADCOUNT_KEYS.all, 'waterfall', params] as const,
};

export function useHeadcountSummary(projectId?: string) {
  return useQuery({
    queryKey: HEADCOUNT_KEYS.summary(projectId),
    queryFn: () => headcountService.getSummary(projectId),
  });
}

export function useHeadcountTimeSeries(params?: any) {
  return useQuery({
    queryKey: HEADCOUNT_KEYS.timeSeries(params),
    queryFn: () => headcountService.getTimeSeries(params),
  });
}

export function useHeadcountWaterfall(params?: any) {
  return useQuery({
    queryKey: HEADCOUNT_KEYS.waterfall(params),
    queryFn: () => headcountService.getWaterfall(params),
  });
}

export function useHeadcountRecords(params?: any) {
  return useQuery({
    queryKey: HEADCOUNT_KEYS.records(params),
    queryFn: () => headcountService.getRecords(params),
  });
}

export function useCreateHeadcountRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: headcountService.createRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: HEADCOUNT_KEYS.all }),
  });
}
