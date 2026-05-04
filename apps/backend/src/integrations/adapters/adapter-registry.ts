import { Injectable } from '@nestjs/common';
import type { IIntegrationAdapter } from './integration-adapter.interface';
import { JiraAdapter } from './jira.adapter';
import { AzureDevOpsAdapter } from './azure-devops.adapter';
import { GithubAdapter } from './github.adapter';
import { LinearAdapter } from './linear.adapter';
import { GenericRestAdapter } from './generic-rest.adapter';

@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<string, IIntegrationAdapter>([
    ['JIRA', new JiraAdapter()],
    ['AZURE_DEVOPS', new AzureDevOpsAdapter()],
    ['GITHUB', new GithubAdapter()],
    ['LINEAR', new LinearAdapter()],
    ['CUSTOM_REST', new GenericRestAdapter()],
  ]);

  get(provider: string): IIntegrationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter registered for provider: ${provider}`);
    return adapter;
  }

  listProviders() {
    return Array.from(this.adapters.values()).map((a) => ({
      provider: a.provider,
      displayName: a.displayName,
    }));
  }
}
