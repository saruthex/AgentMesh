import { getCredential } from '../providers/credentials.js';
import { listAccountAuthCapabilities } from './account-service.js';

export interface AccountAuthStatus {
  provider: string;
  label: string;
  authenticated: boolean;
  available: boolean;
  reason?: string;
  accountLabel?: string;
}

export function accountAuthStatus(): AccountAuthStatus[] {
  return listAccountAuthCapabilities().map(capability => {
    const credential = getCredential(capability.provider);
    return {
      provider: capability.provider,
      label: capability.label,
      authenticated: Boolean(credential?.accessToken),
      available: capability.status === 'available',
      ...(capability.reason ? { reason: capability.reason } : {}),
      ...(credential?.accountLabel ? { accountLabel: credential.accountLabel } : {})
    };
  });
}
