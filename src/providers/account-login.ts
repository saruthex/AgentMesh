export interface AccountLoginStartResult {
  provider: string;
  status: 'unsupported' | 'started';
  authorizationUrl?: string;
  message: string;
}

/**
 * Provider account/subscription authentication must be explicitly supported by
 * the provider. AgentMesh must never scrape another CLI's credentials or
 * browser session.
 */
export interface AccountLoginAdapter {
  readonly provider: string;
  start(): Promise<AccountLoginStartResult>;
}

export function unsupportedAccountLogin(provider: string, message: string): AccountLoginStartResult {
  return { provider, status: 'unsupported', message };
}
