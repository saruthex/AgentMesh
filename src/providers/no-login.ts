import type { LoginAuthMethod, LoginCompletionResult, LoginStartResult, ProviderLoginAdapter } from './auth.js';

export class UnsupportedLoginAdapter implements ProviderLoginAdapter {
  constructor(readonly provider: string) {}

  readonly methods: readonly LoginAuthMethod[] = [];

  async start(_method: LoginAuthMethod): Promise<LoginStartResult> {
    throw new Error(`Login authentication is not officially configured for provider: ${this.provider}`);
  }

  async complete(_input: { code?: string; state?: string }): Promise<LoginCompletionResult> {
    throw new Error(`Login authentication is not officially configured for provider: ${this.provider}`);
  }
}
