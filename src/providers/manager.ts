import { MockProviderAdapter } from "./mock.js";
import { providerRegistry } from "./registry.js";
import type { ProviderMessage } from "./types.js";

let initialized = false;

export function initializeProviders(): void {
  if (initialized) return;
  providerRegistry.register(new MockProviderAdapter());
  initialized = true;
}

export async function executeChat(providerId: string, messages: ProviderMessage[]) {
  initializeProviders();
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    throw new Error(`Provider adapter not configured: ${providerId}. Available adapters: ${providerRegistry.list().join(", ")}`);
  }
  return provider.chat({ messages });
}
