import { AnthropicProviderAdapter } from './anthropic.js';
import { GeminiOAuthAdapter } from './gemini-oauth.js';
import { GeminiProviderAdapter } from './gemini.js';
import { MockProviderAdapter } from './mock.js';
import { OpenAIProviderAdapter } from './openai.js';
import { executeAccountCli, accountCliAuthenticated } from './account-cli.js';
import { providerRegistry } from './registry.js';
import { loginRegistry } from './login-registry.js';
import type { ChatResponse, ProviderMessage } from './types.js';

let initialized = false;

export function initializeProviders(): void {
  if (initialized) return;
  providerRegistry.register(new MockProviderAdapter());
  providerRegistry.register(new OpenAIProviderAdapter());
  providerRegistry.register(new AnthropicProviderAdapter());
  providerRegistry.register(new GeminiProviderAdapter());
  loginRegistry.register(new GeminiOAuthAdapter());
  initialized = true;
}

export interface ExecuteChatOptions {
  model?: string;
  retries?: number;
  authMode?: 'account' | 'api' | 'auto';
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|500|502|503|504|network|fetch failed|timeout/i.test(message);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function canUseAccountCli(providerId: string): boolean {
  if (providerId !== 'openai' && providerId !== 'anthropic') return false;
  try { return accountCliAuthenticated(providerId); } catch { return false; }
}

export async function executeChat(
  providerId: string,
  messages: ProviderMessage[],
  options: ExecuteChatOptions = {}
): Promise<ChatResponse> {
  initializeProviders();

  const provider = providerRegistry.get(providerId);
  if (!provider) {
    throw new Error(`Provider adapter not configured: ${providerId}. Available adapters: ${providerRegistry.list().join(', ')}`);
  }

  const authMode = options.authMode ?? 'auto';
  const accountCapable = canUseAccountCli(providerId);

  if (authMode !== 'api' && accountCapable) {
    try {
      return await executeAccountCli(providerId, messages, options.model);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (authMode === 'account' || /login|authenticate|auth|not logged|unauthorized|credential/i.test(message)) {
        throw error;
      }
    }
  }

  if (authMode === 'account') {
    throw new Error(`Provider "${providerId}" has no authenticated account CLI available. Run \`agentmesh auth\` to check account readiness, then \`agentmesh login ${providerId}\` for supported account login.`);
  }

  const retries = options.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await provider.chat({ messages, model: options.model });
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isTransientError(error)) break;
      await wait(500 * (attempt + 1));
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Provider "${providerId}" failed: ${message}`);
}
