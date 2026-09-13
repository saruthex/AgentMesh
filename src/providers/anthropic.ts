import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';
import { getProviderCredential } from './auth.js';
import { requestJson } from './http.js';

type AnthropicResponse = {
  model?: string;
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class AnthropicProviderAdapter implements ProviderAdapter {
  readonly id = 'anthropic';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const credential = getProviderCredential('anthropic');
    if (!credential?.apiKey) throw new Error('Anthropic API key missing');

    const baseUrl = credential.baseUrl ?? 'https://api.anthropic.com/v1';
    const model = request.model ?? 'claude-3-5-sonnet-latest';
    const system = request.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const messages = request.messages.filter(m => m.role !== 'system');
    const response = await requestJson<AnthropicResponse>(`${baseUrl.replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': credential.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens: 4096, ...(system ? { system } : {}), messages })
    });

    const content = response.content?.filter(x => x.type === 'text').map(x => x.text ?? '').join('') ?? '';
    if (!content) throw new Error('Anthropic returned an empty response');
    return {
      content,
      model: response.model ?? model,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    };
  }
}
