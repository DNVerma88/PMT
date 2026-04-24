import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedViewsService } from '../../services/saved-views.service';

export const SAVED_VIEW_KEYS = {
  all: ['saved-views'] as const,
  list: (module?: string) => [...SAVED_VIEW_KEYS.all, 'list', module] as const,
  one: (id: string) => [...SAVED_VIEW_KEYS.all, id] as const,
};

export function useSavedViews(module?: string) {
  return useQuery({
    queryKey: SAVED_VIEW_KEYS.list(module),
    queryFn: () => savedViewsService.getAll(module),
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savedViewsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_VIEW_KEYS.all }),
  });
}

export function useUpdateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => savedViewsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_VIEW_KEYS.all }),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savedViewsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_VIEW_KEYS.all }),
  });
}

export function useCloneSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savedViewsService.clone,
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_VIEW_KEYS.all }),
  });
}

export function useShareSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { userId: string; canEdit?: boolean } }) =>
      savedViewsService.share(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_VIEW_KEYS.all }),
  });
}
