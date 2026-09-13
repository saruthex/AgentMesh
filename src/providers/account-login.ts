import { accountAuthCapabilities } from './account-auth-capabilities.js';

export interface AccountLoginChoice {
  provider: string;
  label: string;
  available: boolean;
  reason?: string;
}

export function accountLoginChoices(): AccountLoginChoice[] {
  return accountAuthCapabilities().map(capability => ({
    provider: capability.provider,
    label: capability.label,
    available: capability.status === 'available',
    ...(capability.reason ? { reason: capability.reason } : {})
  }));
}

export function accountLoginUnavailableMessage(provider: string): string {
  const capability = accountAuthCapabilities().find(item => item.provider === provider);
  if (!capability) return `Account login is not configured for ${provider}.`;
  return capability.reason ?? `Account login is not currently available for ${capability.label}.`;
}
