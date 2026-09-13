export type AccountAuthStatus = 'available' | 'unavailable';

export interface AccountAuthCapability {
  provider: string;
  label: string;
  status: AccountAuthStatus;
  method?: 'browser';
  reason?: string;
}

export interface AccountLoginAdapter {
  readonly provider: string;
  readonly label: string;
  readonly method: 'browser';
  startBrowserLogin(): Promise<{ authorizationUrl: string }>;
  completeBrowserLogin(): Promise<{ provider: string; accessToken: string; refreshToken?: string; expiresAt?: string; accountLabel?: string }>;
}
