import { accountAuthCapabilities } from '../providers/account-auth-capabilities.js';

export function listAccountLoginCapabilities() {
  return accountAuthCapabilities();
}

export function getAccountLoginCapability(provider: string) {
  return accountAuthCapabilities().find(capability => capability.provider === provider);
}

export async function startAccountLogin(provider: string) {
  const capability = getAccountLoginCapability(provider);
  if (!capability) {
    throw new Error(`Account login is not configured for provider: ${provider}`);
  }
  if (capability.status !== 'available') {
    throw new Error(`${capability.label} account login is currently unavailable. ${capability.reason ?? ''}`.trim());
  }
  throw new Error(`${capability.label} account login is marked available but no login adapter is registered yet.`);
}
