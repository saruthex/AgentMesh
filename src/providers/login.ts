export type LoginProvider = 'openai' | 'anthropic' | 'gemini';

export interface LoginSession {
  provider: LoginProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Provider-login abstraction.
 *
 * Provider-specific OAuth/device authorization must be implemented only for
 * official flows supported by that provider. AgentMesh must never collect or
 * store a user's third-party password.
 */
export interface LoginAdapter {
  readonly provider: LoginProvider;
  startLogin(): Promise<{ authorizationUrl: string; state: string }>;
  completeLogin(input: { code: string; state: string }): Promise<LoginSession>;
}

export class UnsupportedLoginAdapter implements LoginAdapter {
  constructor(readonly provider: LoginProvider) {}

  async startLogin(): Promise<{ authorizationUrl: string; state: string }> {
    throw new Error(`Login authentication is not yet supported for ${this.provider}. Configure an API key or use an official provider OAuth flow when implemented.`);
  }

  async completeLogin(): Promise<LoginSession> {
    throw new Error(`Login authentication is not yet supported for ${this.provider}.`);
  }
}
