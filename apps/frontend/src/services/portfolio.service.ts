import { api } from './api';

export interface PortfolioSummary {
  totalProjects: number;
  activeProjects: number;
  totalReleases: number;
  totalMembers: number;
  releaseStatusBreakdown: Record<string, number>;
  milestoneStatusBreakdown: Record<string, number>;
}

export interface ProjectHealthRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  overallHealth: 'red' | 'amber' | 'green';
  releases: {
    id: string;
    name: string;
    version: string;
    status: string;
    plannedEnd: string;
    actualEnd?: string;
    totalMilestones: number;
    completedMilestones: number;
    overdueMilestones: number;
    health: 'red' | 'amber' | 'green';
  }[];
}

export interface HeadcountPoint {
  projectId: string;
  projectName: string;
  projectCode: string;
  period: string;
  closing: number;
  planned: number;
}

export interface ProductivityPoint {
  projectId: string;
  projectName: string;
  projectCode: string;
  period: string;
  planned: number;
  actual: number;
}

export interface UpcomingMilestone {
  milestoneId: string;
  type: string;
  status: string;
  plannedDate: string;
  releaseName: string;
  releaseVersion: string;
  releaseStatus: string;
  project: { id: string; name: string; code: string } | null;
  daysUntilDue: number;
}

export interface PortfolioRisks {
  overdueMilestones: {
    id: string;
    type: string;
    status: string;
    plannedDate: string;
    release: string;
    version: string;
    project: { id: string; name: string; code: string } | null;
    daysOverdue: number;
  }[];
  delayedReleases: {
    id: string;
    name: string;
    version: string;
    status: string;
    plannedEnd: string;
    project: { id: string; name: string; code: string } | null;
  }[];
}

const portfolioService = {
  getSummary: () => api.get<PortfolioSummary>('/portfolio/summary').then((r) => r.data),
  getReleaseHealth: () => api.get<ProjectHealthRow[]>('/portfolio/release-health').then((r) => r.data),
  getHeadcount: () => api.get<HeadcountPoint[]>('/portfolio/headcount').then((r) => r.data),
  getProductivity: () => api.get<ProductivityPoint[]>('/portfolio/productivity').then((r) => r.data),
  getMilestones: (days?: number) =>
    api.get<UpcomingMilestone[]>(`/portfolio/milestones${days ? `?days=${days}` : ''}`).then((r) => r.data),
  getRisks: () => api.get<PortfolioRisks>('/portfolio/risks').then((r) => r.data),
};

export default portfolioService;
