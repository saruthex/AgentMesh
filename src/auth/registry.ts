import type { ProviderLoginAdapter } from '../providers/auth.js';

class LoginRegistry {
  private readonly adapters = new Map<string, ProviderLoginAdapter>();

  register(adapter: ProviderLoginAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): ProviderLoginAdapter | undefined {
    return this.adapters.get(provider);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }
}

export const loginRegistry = new LoginRegistry();
