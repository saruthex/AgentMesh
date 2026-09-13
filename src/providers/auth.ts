const ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY'
};

export type LoginAuthMethod = 'oauth' | 'device';

export interface LoginStartResult {
  provider: string;
  method: LoginAuthMethod;
  authorizationUrl?: string;
  userCode?: string;
  verificationUrl?: string;
  expiresIn?: number;
}

export interface LoginCompletionResult {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  accountLabel?: string;
}

export interface ProviderLoginAdapter {
  readonly provider: string;
  readonly methods: readonly LoginAuthMethod[];
  start(method: LoginAuthMethod): Promise<LoginStartResult>;
  complete(input: { code?: string; state?: string }): Promise<LoginCompletionResult>;
}

export function getProviderApiKey(provider: string): string {
  const envKey = ENV_KEYS[provider];
  if (!envKey) throw new Error(`No environment key mapping for provider: ${provider}`);

  const value = process.env[envKey]?.trim();
  if (!value) {
    throw new Error(`Missing ${envKey}. Set it in your shell environment; AgentMesh never stores API keys in project files.`);
  }

  return value;
}

export function providerAuthStatus(provider: string): boolean {
  const envKey = ENV_KEYS[provider];
  return Boolean(envKey && process.env[envKey]?.trim());
}

export function supportedAuthProviders(): string[] {
  return Object.keys(ENV_KEYS);
}
