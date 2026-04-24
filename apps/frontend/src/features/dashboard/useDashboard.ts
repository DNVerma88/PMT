import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';

export function useDashboardSummary(projectId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'summary', projectId],
    queryFn: () => dashboardService.getSummary(projectId),
  });
}
