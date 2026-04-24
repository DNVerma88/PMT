import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateFeaturePayload,
  featuresService,
} from '../../services/features.service';
import { releaseCadenceService } from '../../services/release-cadence.service';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const FEATURE_KEYS = {
  all: ['features'] as const,
  timeline: (p: { sprintCalendarId?: string; projectId?: string }) =>
    [...FEATURE_KEYS.all, 'timeline', p] as const,
  list: (p?: { projectId?: string; sprintCalendarId?: string }) =>
    [...FEATURE_KEYS.all, 'list', p] as const,
  calendarDetail: (id?: string) => ['sprintCalendar', 'detail', id] as const,
};

// ── Read Hooks ────────────────────────────────────────────────────────────────

export function useFeatureTimeline(params: {
  sprintCalendarId?: string;
  projectId?: string;
}) {
  return useQuery({
    queryKey: FEATURE_KEYS.timeline(params),
    queryFn: () =>
      featuresService.getTimeline({
        sprintCalendarId: params.sprintCalendarId!,
        projectId: params.projectId,
      }),
    enabled: !!params.sprintCalendarId,
  });
}

/** Fetches a sprint calendar with its full sprint list — used in the drawer to
 *  populate the sprint number dropdowns. */
export function useSprintCalendarDetail(id?: string) {
  return useQuery({
    queryKey: FEATURE_KEYS.calendarDetail(id),
    queryFn: () => releaseCadenceService.getSprintCalendar(id!),
    enabled: !!id,
    select: (data) =>
      data as {
        id: string;
        name: string;
        sprints: { id: string; number: number; name: string; startDate: string; endDate: string }[];
      },
  });
}

// ── Mutation Hooks ────────────────────────────────────────────────────────────

export function useCreateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeaturePayload) => featuresService.createFeature(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEATURE_KEYS.all }),
  });
}

export function useUpdateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFeaturePayload> }) =>
      featuresService.updateFeature(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEATURE_KEYS.all }),
  });
}

export function useDeleteFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => featuresService.deleteFeature(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEATURE_KEYS.all }),
  });
}
