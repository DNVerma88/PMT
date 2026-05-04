import type {
  AdapterConfig,
  AdapterCredentials,
  AdapterSyncResult,
  IIntegrationAdapter,
  NormalisedItem,
} from './integration-adapter.interface';

/**
 * GitHub Issues adapter.
 *
 * Required credentials:
 *   - token — GitHub Personal Access Token (PAT) or App installation token
 *
 * Required config:
 *   - owner — org or user login
 *   - repo  — repository name (or comma-separated list)
 */
export class GithubAdapter implements IIntegrationAdapter {
  readonly provider = 'GITHUB';
  readonly displayName = 'GitHub Issues';

  private base = 'https://api.github.com';

  private headers(credentials: AdapterCredentials) {
    return {
      Authorization: `Bearer ${credentials.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async validateCredentials(credentials: AdapterCredentials, _config: AdapterConfig): Promise<void> {
    const res = await fetch(`${this.base}/user`, { headers: this.headers(credentials) });
    if (!res.ok) throw new Error(`GitHub auth failed: ${res.status} ${res.statusText}`);
  }

  async fetchItems(credentials: AdapterCredentials, config: AdapterConfig): Promise<AdapterSyncResult> {
    const owner = config.owner ?? '';
    const repos: string[] = (config.repo ?? '').split(',').map((r: string) => r.trim()).filter(Boolean);
    if (repos.length === 0) return { items: [] };

    const allItems: NormalisedItem[] = [];

    for (const repo of repos) {
      const url = `${this.base}/repos/${owner}/${repo}/issues?state=open&per_page=100`;
      const res = await fetch(url, { headers: this.headers(credentials) });
      if (!res.ok) throw new Error(`GitHub fetch failed for ${repo}: ${res.status}`);
      const issues: any[] = await res.json();

      for (const issue of issues) {
        if (issue.pull_request) continue; // skip PRs
        allItems.push({
          externalId: String(issue.id),
          title: issue.title,
          description: issue.body ?? undefined,
          status: issue.state,
          type: issue.labels?.find((l: any) => ['bug', 'enhancement', 'feature'].includes(l.name))?.name ?? 'issue',
          assignee: issue.assignee?.login,
          labels: (issue.labels ?? []).map((l: any) => l.name),
          dueDate: issue.milestone?.due_on,
          url: issue.html_url,
          rawPayload: issue,
        });
      }
    }

    return { items: allItems };
  }
}
