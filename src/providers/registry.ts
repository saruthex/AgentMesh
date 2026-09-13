import type { ProviderAdapter } from "./types.js";

export class ProviderRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  capabilities(): Record<string, NonNullable<ProviderAdapter["capabilities"]>> {
    return Object.fromEntries(
      [...this.adapters.entries()]
        .filter(([, adapter]) => adapter.capabilities)
        .map(([id, adapter]) => [id, adapter.capabilities!])
    );
  }
}

export const providerRegistry = new ProviderRegistry();
