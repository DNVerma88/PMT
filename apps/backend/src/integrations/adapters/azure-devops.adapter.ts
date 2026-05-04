import type {
  AdapterConfig,
  AdapterCredentials,
  AdapterSyncResult,
  IIntegrationAdapter,
  NormalisedItem,
} from './integration-adapter.interface';

/**
 * Azure DevOps adapter.
 *
 * Required credentials:
 *   - token — Personal Access Token (PAT)
 *
 * Required config:
 *   - org        — ADO organisation slug
 *   - project    — ADO project name
 */
export class AzureDevOpsAdapter implements IIntegrationAdapter {
  readonly provider = 'AZURE_DEVOPS';
  readonly displayName = 'Azure DevOps';

  private baseUrl(config: AdapterConfig) {
    return (config.baseUrl ?? 'https://dev.azure.com').replace(/\/$/, '');
  }

  private authHeader(credentials: AdapterCredentials): string {
    return 'Basic ' + Buffer.from(`:${credentials.token}`).toString('base64');
  }

  async validateCredentials(credentials: AdapterCredentials, config: AdapterConfig): Promise<void> {
    const url = `${this.baseUrl(config)}/${config.org}/_apis/projects?api-version=7.0`;
    const res = await fetch(url, {
      headers: { Authorization: this.authHeader(credentials), Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Azure DevOps auth failed: ${res.status} ${res.statusText}`);
  }

  async fetchItems(credentials: AdapterCredentials, config: AdapterConfig): Promise<AdapterSyncResult> {
    const base = this.baseUrl(config);
    const org = config.org ?? '';
    const project = config.project ?? '';

    // Run a WIQL query to fetch work items
    const wiqlUrl = `${base}/${org}/${project}/_apis/wit/wiql?api-version=7.0`;
    const wiqlBody = {
      query: `SELECT [System.Id],[System.Title],[System.State],[System.WorkItemType],[System.AssignedTo],[System.Tags],[Microsoft.VSTS.Scheduling.DueDate] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.ChangedDate] DESC`,
    };

    const wiqlRes = await fetch(wiqlUrl, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(credentials),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(wiqlBody),
    });
    if (!wiqlRes.ok) throw new Error(`ADO WIQL failed: ${wiqlRes.status}`);
    const wiqlData: any = await wiqlRes.json();
    const ids: number[] = (wiqlData.workItems ?? []).slice(0, 100).map((w: any) => w.id);
    if (ids.length === 0) return { items: [] };

    const batchUrl = `${base}/${org}/${project}/_apis/wit/workitemsbatch?api-version=7.0`;
    const batchRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(credentials),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ids,
        fields: ['System.Id', 'System.Title', 'System.Description', 'System.State', 'System.WorkItemType', 'System.AssignedTo', 'System.Tags', 'Microsoft.VSTS.Scheduling.DueDate'],
      }),
    });
    if (!batchRes.ok) throw new Error(`ADO batch fetch failed: ${batchRes.status}`);
    const batchData: any = await batchRes.json();

    const items: NormalisedItem[] = (batchData.value ?? []).map((wi: any) => ({
      externalId: String(wi.id),
      title: wi.fields?.['System.Title'] ?? '',
      description: wi.fields?.['System.Description'],
      status: wi.fields?.['System.State'],
      type: wi.fields?.['System.WorkItemType'],
      assignee: wi.fields?.['System.AssignedTo']?.displayName,
      labels: wi.fields?.['System.Tags'] ? wi.fields['System.Tags'].split(';').map((t: string) => t.trim()) : [],
      dueDate: wi.fields?.['Microsoft.VSTS.Scheduling.DueDate'],
      url: `${base}/${org}/${project}/_workitems/edit/${wi.id}`,
      rawPayload: wi,
    }));

    return { items };
  }
}
