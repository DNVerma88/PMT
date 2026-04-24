import { useQuery } from '@tanstack/react-query';
import { roadmapService } from '../../services/roadmap.service';

export const ROADMAP_KEYS = {
  all: ['roadmap'] as const,
  gantt: (params?: any) => [...ROADMAP_KEYS.all, 'gantt', params] as const,
  summary: (projectId?: string) => [...ROADMAP_KEYS.all, 'summary', projectId] as const,
};

export function useRoadmapGantt(params?: { projectId?: string; startDate?: string; endDate?: string; status?: string }) {
  return useQuery({
    queryKey: ROADMAP_KEYS.gantt(params),
    queryFn: () => roadmapService.getGantt(params),
  });
}

export function useRoadmapSummary(projectId?: string) {
  return useQuery({
    queryKey: ROADMAP_KEYS.summary(projectId),
    queryFn: () => roadmapService.getSummary(projectId),
  });
}
