import type { AccountAuthCapability } from '../providers/account-auth.js';
import { accountAuthCapabilities } from '../providers/account-auth-capabilities.js';

export function listAccountAuthCapabilities(): AccountAuthCapability[] {
  return accountAuthCapabilities();
}

export function getAccountAuthCapability(provider: string): AccountAuthCapability | undefined {
  return accountAuthCapabilities().find(capability => capability.provider === provider);
}

export async function beginAccountLogin(provider: string): Promise<AccountAuthCapability> {
  const capability = getAccountAuthCapability(provider);
  if (!capability) {
    throw new Error(`Account login is not configured for provider: ${provider}`);
  }
  if (capability.status !== 'available') {
    throw new Error(capability.reason ?? `Account login is currently unavailable for ${provider}.`);
  }
  return capability;
}
