import { api } from './api';

export interface StateConfig {
  key: string;
  label: string;
  color: string;
}

export interface LeaveTypeConfig {
  key: string;
  label: string;
}

export interface WsrConfig {
  id: string;
  projectId: string;
  reportTitle: string;
  clientName?: string;
  vendorName?: string;
  titleStaffing: string;
  titleProductivity: string;
  titleRoadmap: string;
  titleDonePlanned: string;
  titleAchieved: string;
  titleLeaves: string;
  titleAppreciation: string;
  titleRisk: string;
  showStaffing: boolean;
  showProductivity: boolean;
  showRoadmap: boolean;
  showDonePlanned: boolean;
  showAchieved: boolean;
  showLeaves: boolean;
  showAppreciation: boolean;
  showRisk: boolean;
  sectionOrder: string[];
  storyStateConfig: StateConfig[];
  bugStateConfig: StateConfig[];
  leaveTypeConfig: LeaveTypeConfig[];
}

export interface WeeklyReport {
  id: string;
  projectId: string;
  teamId?: string;
  weekOf: string;
  sprintRef?: string;
  noteDonePlanned?: string;
  noteAchieved?: string;
  noteAppreciation?: string;
  noteRiskConcern?: string;
  updatedAt: string;
}

export interface WsrReportPayload {
  meta: { projectId: string; weekOf: string; weekEnd: string };
  config: WsrConfig;
  notes: WeeklyReport | null;
  sections: {
    staffing: unknown[];
    productivity: unknown | null;
    roadmap: { features: unknown[]; releases: unknown[] };
    leaves: unknown[];
    risks: unknown[];
  };
}

export interface UpsertConfigPayload {
  projectId: string;
  reportTitle?: string;
  clientName?: string;
  vendorName?: string;
  titleStaffing?: string;
  titleProductivity?: string;
  titleRoadmap?: string;
  titleDonePlanned?: string;
  titleAchieved?: string;
  titleLeaves?: string;
  titleAppreciation?: string;
  titleRisk?: string;
  showStaffing?: boolean;
  showProductivity?: boolean;
  showRoadmap?: boolean;
  showDonePlanned?: boolean;
  showAchieved?: boolean;
  showLeaves?: boolean;
  showAppreciation?: boolean;
  showRisk?: boolean;
  sectionOrder?: string[];
  storyStateConfig?: StateConfig[];
  bugStateConfig?: StateConfig[];
  leaveTypeConfig?: LeaveTypeConfig[];
}

export interface UpsertNotesPayload {
  projectId: string;
  teamId?: string;
  weekOf: string;
  sprintRef?: string;
  noteDonePlanned?: string;
  noteAchieved?: string;
  noteAppreciation?: string;
  noteRiskConcern?: string;
}

const wsrService = {
  getConfig: (projectId: string) =>
    api.get<WsrConfig>('/wsr/config', { params: { projectId } }).then((r) => r.data),

  upsertConfig: (payload: UpsertConfigPayload) =>
    api.put<WsrConfig>('/wsr/config', payload).then((r) => r.data),

  resetConfig: (projectId: string) =>
    api.post<WsrConfig>('/wsr/config/reset', null, { params: { projectId } }).then((r) => r.data),

  upsertNotes: (payload: UpsertNotesPayload) =>
    api.put<WeeklyReport>('/wsr/notes', payload).then((r) => r.data),

  assembleReport: (projectId: string, weekOf: string, teamId?: string) =>
    api
      .get<WsrReportPayload>('/wsr/report', { params: { projectId, weekOf, teamId } })
      .then((r) => r.data),
};

export default wsrService;
