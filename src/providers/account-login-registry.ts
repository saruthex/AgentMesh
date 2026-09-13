import type { AccountLoginAdapter } from './account-login.js';

class AccountLoginRegistry {
  private readonly adapters = new Map<string, AccountLoginAdapter>();

  register(adapter: AccountLoginAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): AccountLoginAdapter | undefined {
    return this.adapters.get(provider);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }
}

export const accountLoginRegistry = new AccountLoginRegistry();
