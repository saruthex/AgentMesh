import { accountCliAuthenticated, accountCliLogin, accountCliProviders } from '../providers/account-cli.js';

export function accountLoginProviders(): string[] {
  return accountCliProviders();
}

export function accountLoginAvailability(provider: string): boolean {
  try { return accountCliAuthenticated(provider); } catch { return false; }
}

export async function startAccountLogin(provider: string): Promise<void> {
  if (!accountLoginProviders().includes(provider)) {
    throw new Error(`Account login is not configured for provider: ${provider}`);
  }
  await accountCliLogin(provider);
}
