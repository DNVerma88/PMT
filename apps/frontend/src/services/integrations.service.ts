import { api } from './api';

export type IntegrationProvider =
  | 'JIRA'
  | 'AZURE_DEVOPS'
  | 'GITHUB'
  | 'LINEAR'
  | 'GITLAB'
  | 'TRELLO'
  | 'SHORTCUT'
  | 'CUSTOM_REST';

export type IntegrationStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'PENDING_AUTH';
export type SyncDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
export type SyncStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface IntegrationConnection {
  id: string;
  projectId?: string;
  provider: IntegrationProvider;
  label: string;
  baseUrl?: string;
  status: IntegrationStatus;
  syncDirection: SyncDirection;
  config: Record<string, any>;
  lastSyncAt?: string;
  errorMsg?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SyncLog {
  id: string;
  status: SyncStatus;
  itemsSynced: number;
  itemsFailed: number;
  durationMs?: number;
  errorMsg?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface ProviderMeta {
  provider: IntegrationProvider;
  displayName: string;
}

export interface CreateIntegrationPayload {
  projectId?: string;
  provider: IntegrationProvider;
  label: string;
  baseUrl?: string;
  syncDirection: SyncDirection;
  config?: Record<string, any>;
}

export interface FieldMap {
  id: string;
  connectionId: string;
  pmtField: string;
  externalField: string;
  transform?: Record<string, any>;
}

const integrationsService = {
  listProviders: () =>
    api.get<ProviderMeta[]>('/integrations/providers').then((r) => r.data),

  list: (projectId?: string) =>
    api.get<IntegrationConnection[]>('/integrations', { params: projectId ? { projectId } : {} }).then((r) => r.data),

  get: (id: string) =>
    api.get<IntegrationConnection & { fieldMaps: FieldMap[] }>(`/integrations/${id}`).then((r) => r.data),

  create: (payload: CreateIntegrationPayload) =>
    api.post<IntegrationConnection>('/integrations', payload).then((r) => r.data),

  update: (id: string, payload: Partial<Omit<CreateIntegrationPayload, 'provider'>>) =>
    api.patch<IntegrationConnection>(`/integrations/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/integrations/${id}`),

  saveCredentials: (id: string, credentials: Record<string, string>) =>
    api.post(`/integrations/${id}/credentials`, { credentials }).then((r) => r.data),

  testConnection: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/integrations/${id}/test`).then((r) => r.data),

  triggerSync: (id: string) =>
    api.post<{ syncLogId: string }>(`/integrations/${id}/sync`).then((r) => r.data),

  getLogs: (id: string) =>
    api.get<SyncLog[]>(`/integrations/${id}/logs`).then((r) => r.data),

  upsertFieldMap: (id: string, pmtField: string, externalField: string, transform?: Record<string, any>) =>
    api.post<FieldMap>(`/integrations/${id}/field-maps`, { pmtField, externalField, transform }).then((r) => r.data),

  deleteFieldMap: (id: string, pmtField: string) =>
    api.delete(`/integrations/${id}/field-maps/${encodeURIComponent(pmtField)}`),
};

export default integrationsService;
