/**
 * IIntegrationAdapter — interface every provider adapter must implement.
 *
 * The adapter is responsible for:
 * 1. Validating credentials against the external service.
 * 2. Fetching a normalised data snapshot from the external service.
 * 3. Pushing PMT data changes to the external service (when bidirectional / outbound).
 *
 * Adapters must be stateless; all auth state comes through `credentials`.
 */
export interface AdapterCredentials {
  [key: string]: string;
}

export interface AdapterConfig {
  baseUrl?: string;
  [key: string]: any;
}

export interface NormalisedItem {
  externalId: string;
  title: string;
  description?: string;
  status?: string;
  type?: string;
  assignee?: string;
  labels?: string[];
  dueDate?: string;
  url?: string;
  rawPayload: Record<string, any>;
}

export interface AdapterSyncResult {
  items: NormalisedItem[];
  cursor?: string; // pagination cursor / lastModifiedDate for incremental sync
}

export interface IIntegrationAdapter {
  /** Provider identifier */
  readonly provider: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Verify credentials are valid — throws if invalid */
  validateCredentials(credentials: AdapterCredentials, config: AdapterConfig): Promise<void>;

  /** Pull items from the external tool */
  fetchItems(credentials: AdapterCredentials, config: AdapterConfig): Promise<AdapterSyncResult>;

  /** Push a PMT object change to the external tool (optional — adapters can return not-implemented) */
  pushChange?(
    credentials: AdapterCredentials,
    config: AdapterConfig,
    item: NormalisedItem,
  ): Promise<void>;
}
