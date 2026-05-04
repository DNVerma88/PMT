import type {
  AdapterConfig,
  AdapterCredentials,
  AdapterSyncResult,
  IIntegrationAdapter,
  NormalisedItem,
} from './integration-adapter.interface';

/**
 * Jira adapter — uses the Jira REST API v3 with a Personal Access Token (PAT)
 * or API-token + email pair.
 *
 * Required credentials:
 *   - email (for cloud) or omit (for PAT / server)
 *   - token  — API token or PAT
 *
 * Required config:
 *   - projectKey  — Jira project key(s), comma-separated
 */
export class JiraAdapter implements IIntegrationAdapter {
  readonly provider = 'JIRA';
  readonly displayName = 'Jira';

  private authHeader(credentials: AdapterCredentials): string {
    if (credentials.email) {
      return 'Basic ' + Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');
    }
    return `Bearer ${credentials.token}`;
  }

  async validateCredentials(credentials: AdapterCredentials, config: AdapterConfig): Promise<void> {
    const base = (config.baseUrl ?? '').replace(/\/$/, '');
    const res = await fetch(`${base}/rest/api/3/myself`, {
      headers: { Authorization: this.authHeader(credentials), Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Jira auth failed: ${res.status} ${res.statusText}`);
  }

  async fetchItems(credentials: AdapterCredentials, config: AdapterConfig): Promise<AdapterSyncResult> {
    const base = (config.baseUrl ?? '').replace(/\/$/, '');
    const projectKey = config.projectKey ?? '';
    const jql = projectKey
      ? `project IN (${projectKey}) ORDER BY updated DESC`
      : 'ORDER BY updated DESC';

    const url = `${base}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,description,status,issuetype,assignee,labels,duedate`;

    const res = await fetch(url, {
      headers: { Authorization: this.authHeader(credentials), Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Jira fetch failed: ${res.status}`);

    const body: any = await res.json();
    const items: NormalisedItem[] = (body.issues ?? []).map((issue: any) => ({
      externalId: issue.id,
      title: issue.fields?.summary ?? issue.key,
      description: issue.fields?.description?.content?.[0]?.content?.[0]?.text,
      status: issue.fields?.status?.name,
      type: issue.fields?.issuetype?.name,
      assignee: issue.fields?.assignee?.displayName,
      labels: issue.fields?.labels ?? [],
      dueDate: issue.fields?.duedate,
      url: `${base}/browse/${issue.key}`,
      rawPayload: issue,
    }));

    return { items };
  }
}
