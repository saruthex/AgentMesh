import type { LoginAuthMethod, LoginCompletionResult, LoginStartResult } from '../providers/auth.js';

export interface LoginAdapter {
  readonly provider: string;
  readonly methods: readonly LoginAuthMethod[];
  start(method: LoginAuthMethod): Promise<LoginStartResult>;
  complete(input: { code?: string; state?: string }): Promise<LoginCompletionResult>;
}

export class LoginRegistry {
  private readonly adapters = new Map<string, LoginAdapter>();

  register(adapter: LoginAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): LoginAdapter | undefined {
    return this.adapters.get(provider);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }
}

export const loginRegistry = new LoginRegistry();
