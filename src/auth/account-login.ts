import { accountCliAuthenticated, accountCliInstalled, accountCliLogin, accountCliProviders } from '../providers/account-cli.js';

export function accountLoginProviders(): string[] {
  return accountCliProviders();
}

export function accountLoginAvailability(provider: string): boolean {
  try { return accountCliAuthenticated(provider); } catch { return false; }
}

export function accountLoginStatus(provider: string): 'authenticated' | 'installed' | 'unavailable' | 'broken' {
  try {
    if (accountCliAuthenticated(provider)) return 'authenticated';
    if (accountCliInstalled(provider)) return 'installed';
    return 'unavailable';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return /installed but not runnable|not runnable|broken|platform/i.test(message) ? 'broken' : 'unavailable';
  }
}

export async function startAccountLogin(provider: string): Promise<void> {
  if (!accountLoginProviders().includes(provider)) {
    throw new Error(`Account login is not configured for provider: ${provider}`);
  }
  await accountCliLogin(provider);
}
