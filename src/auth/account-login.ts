import { accountCliInstalled, accountCliLogin, accountCliProviders } from '../providers/account-cli.js';

export function accountLoginProviders(): string[] {
  return accountCliProviders();
}

export function accountLoginAvailability(provider: string): boolean {
  try { return accountCliInstalled(provider); } catch { return false; }
}

export async function startAccountLogin(provider: string): Promise<void> {
  if (!accountLoginAvailability(provider)) {
    throw new Error(`${provider} account login requires its official CLI to be installed and available on PATH.`);
  }
  await accountCliLogin(provider);
}
