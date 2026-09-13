import { loginRegistry } from './login-registry.js';
import type { LoginAuthMethod, LoginCompletionResult, LoginStartResult } from './auth.js';
import { credentialStore } from './credential-store.js';

export async function startLogin(provider: string, method: LoginAuthMethod = 'oauth'): Promise<LoginStartResult> {
  const adapter = loginRegistry.get(provider);
  if (!adapter) throw new Error(`Login is not supported for provider: ${provider}`);
  if (!adapter.methods.includes(method)) {
    throw new Error(`Login method "${method}" is not supported for provider: ${provider}`);
  }
  return adapter.start(method);
}

export async function completeLogin(provider: string, input: { code?: string; state?: string }): Promise<LoginCompletionResult> {
  const adapter = loginRegistry.get(provider);
  if (!adapter) throw new Error(`Login is not supported for provider: ${provider}`);

  const result = await adapter.complete(input);
  credentialStore.save(provider, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt,
    accountLabel: result.accountLabel
  });
  return result;
}

export function loginStatus(provider?: string): string[] {
  const providers = provider ? [provider] : loginRegistry.list();
  return providers.map(name => {
    const stored = credentialStore.get(name);
    return `${name}: ${stored ? 'authenticated' : 'not authenticated'}`;
  });
}
