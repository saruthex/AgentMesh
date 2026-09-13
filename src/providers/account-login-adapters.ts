import type { AccountLoginAdapter, AccountLoginStartResult } from './account-login.js';
import { unsupportedAccountLogin } from './account-login.js';

const reasons: Record<string, string> = {
  gemini: 'AgentMesh cannot reuse Gemini CLI account OAuth. Google requires third-party integrations to use supported API/Vertex authentication paths.',
  openai: 'AgentMesh cannot reuse Codex account credentials. An official third-party ChatGPT account-login flow must be exposed for AgentMesh before subscription login can be enabled.',
  anthropic: 'No official third-party Claude subscription login flow is configured for AgentMesh.'
};

class UnsupportedAccountLoginAdapter implements AccountLoginAdapter {
  readonly provider: string;

  constructor(provider: string) {
    this.provider = provider;
  }

  async start(): Promise<AccountLoginStartResult> {
    return unsupportedAccountLogin(this.provider, reasons[this.provider] ?? `Account login is unavailable for ${this.provider}.`);
  }
}

export function unsupportedAccountLoginAdapters(): AccountLoginAdapter[] {
  return ['gemini', 'openai', 'anthropic'].map(provider => new UnsupportedAccountLoginAdapter(provider));
}
