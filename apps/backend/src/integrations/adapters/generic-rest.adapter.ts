import type {
  AdapterConfig,
  AdapterCredentials,
  AdapterSyncResult,
  IIntegrationAdapter,
  NormalisedItem,
} from './integration-adapter.interface';

/**
 * Generic REST adapter.
 *
 * Reads items from any REST endpoint that returns a JSON array or
 * a JSON object with an `items` / `data` / `results` array.
 *
 * Required credentials:
 *   - token — Bearer token (or empty string for public endpoints)
 *
 * Required config:
 *   - baseUrl     — endpoint URL
 *   - itemsPath   — (optional) dot-path to items array, e.g. "data.items"
 *   - idField     — field to use as externalId (default: "id")
 *   - titleField  — field to use as title (default: "title" or "name")
 *   - statusField — field to map to status (default: "status")
 */
export class GenericRestAdapter implements IIntegrationAdapter {
  readonly provider = 'CUSTOM_REST';
  readonly displayName = 'Generic REST';

  private pick(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  async validateCredentials(credentials: AdapterCredentials, config: AdapterConfig): Promise<void> {
    const url = (config.baseUrl ?? '').replace(/\/$/, '');
    if (!url) throw new Error('baseUrl is required for the Generic REST adapter');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (credentials.token) headers['Authorization'] = `Bearer ${credentials.token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Generic REST validation failed: ${res.status} ${res.statusText}`);
  }

  async fetchItems(credentials: AdapterCredentials, config: AdapterConfig): Promise<AdapterSyncResult> {
    const url = (config.baseUrl ?? '').replace(/\/$/, '');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (credentials.token) headers['Authorization'] = `Bearer ${credentials.token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Generic REST fetch failed: ${res.status}`);

    const body: any = await res.json();

    // Resolve items array
    let rawItems: any[] = [];
    if (config.itemsPath) {
      rawItems = this.pick(body, config.itemsPath) ?? [];
    } else if (Array.isArray(body)) {
      rawItems = body;
    } else {
      rawItems = body.items ?? body.data ?? body.results ?? [];
    }

    const idField = config.idField ?? 'id';
    const titleField = config.titleField ?? (rawItems[0]?.title !== undefined ? 'title' : 'name');
    const statusField = config.statusField ?? 'status';

    const items: NormalisedItem[] = rawItems.map((item: any) => ({
      externalId: String(item[idField] ?? ''),
      title: item[titleField] ?? String(item[idField] ?? ''),
      description: item.description ?? item.body ?? undefined,
      status: item[statusField],
      type: item.type ?? undefined,
      assignee: item.assignee ?? item.assignedTo ?? undefined,
      labels: Array.isArray(item.labels) ? item.labels : [],
      dueDate: item.dueDate ?? item.due_date ?? undefined,
      url: item.url ?? item.link ?? undefined,
      rawPayload: item,
    }));

    return { items };
  }
}
