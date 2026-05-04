import type {
  AdapterConfig,
  AdapterCredentials,
  AdapterSyncResult,
  IIntegrationAdapter,
  NormalisedItem,
} from './integration-adapter.interface';

/**
 * Linear adapter.
 *
 * Required credentials:
 *   - token — Linear API key
 *
 * Optional config:
 *   - teamId — Linear team ID to scope issues
 */
export class LinearAdapter implements IIntegrationAdapter {
  readonly provider = 'LINEAR';
  readonly displayName = 'Linear';

  private readonly apiUrl = 'https://api.linear.app/graphql';

  async validateCredentials(credentials: AdapterCredentials, _config: AdapterConfig): Promise<void> {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: credentials.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ viewer { id email } }' }),
    });
    if (!res.ok) throw new Error(`Linear auth failed: ${res.status}`);
    const body: any = await res.json();
    if (body.errors?.length) throw new Error(`Linear auth error: ${body.errors[0].message}`);
  }

  async fetchItems(credentials: AdapterCredentials, config: AdapterConfig): Promise<AdapterSyncResult> {
    const teamFilter = config.teamId ? `filter: { team: { id: { eq: "${config.teamId}" } } }` : '';
    const query = `
      {
        issues(${teamFilter} first: 100 orderBy: updatedAt) {
          nodes {
            id title description
            state { name }
            assignee { displayName }
            labels { nodes { name } }
            dueDate
            url
            team { name }
          }
        }
      }
    `;

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: credentials.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Linear fetch failed: ${res.status}`);
    const body: any = await res.json();
    if (body.errors?.length) throw new Error(`Linear fetch error: ${body.errors[0].message}`);

    const items: NormalisedItem[] = (body.data?.issues?.nodes ?? []).map((issue: any) => ({
      externalId: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.state?.name,
      type: 'issue',
      assignee: issue.assignee?.displayName,
      labels: (issue.labels?.nodes ?? []).map((l: any) => l.name),
      dueDate: issue.dueDate,
      url: issue.url,
      rawPayload: issue,
    }));

    return { items };
  }
}
