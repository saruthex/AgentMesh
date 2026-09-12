const ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY'
};

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
