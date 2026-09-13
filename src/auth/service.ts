import { getCredential, removeCredential, saveCredential, type StoredCredential } from './credentials.js';
import { loginRegistry } from './registry.js';
import type { LoginAuthMethod } from '../providers/auth.js';

export function listLoginProviders(): string[] {
  return loginRegistry.list();
}

export async function beginLogin(provider: string, method: LoginAuthMethod = 'oauth') {
  const adapter = loginRegistry.get(provider);
  if (!adapter) throw new Error(`Login is not supported for provider: ${provider}`);
  if (!adapter.methods.includes(method)) {
    throw new Error(`Login method "${method}" is not supported by ${provider}. Available: ${adapter.methods.join(', ')}`);
  }
  return adapter.start(method);
}

export async function completeLogin(provider: string, input: { code?: string; state?: string }) {
  const adapter = loginRegistry.get(provider);
  if (!adapter) throw new Error(`Login is not supported for provider: ${provider}`);
  const result = await adapter.complete(input);
  const credential: StoredCredential = {
    provider: result.provider,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt,
    accountLabel: result.accountLabel
  };
  saveCredential(credential);
  return { ...result, stored: true };
}

export function authCredential(provider: string): StoredCredential | undefined {
  return getCredential(provider);
}

export function logout(provider: string): boolean {
  return removeCredential(provider);
}
