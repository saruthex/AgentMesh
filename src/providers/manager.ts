import { AnthropicProviderAdapter } from './anthropic.js';
import { GeminiOAuthAdapter } from './gemini-oauth.js';
import { GeminiProviderAdapter } from './gemini.js';
import { MockProviderAdapter } from './mock.js';
import { OpenAIProviderAdapter } from './openai.js';
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
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|500|502|503|504|network|fetch failed|timeout/i.test(message);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
