import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';
import { getProviderCredential } from './auth.js';
import { jsonHeaders, requestJson } from './http.js';

type OpenAIResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export class OpenAIProviderAdapter implements ProviderAdapter {
  readonly id = 'openai';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const credential = getProviderCredential('openai');
    if (!credential?.apiKey) throw new Error('OpenAI API key missing');

    const baseUrl = credential.baseUrl ?? 'https://api.openai.com/v1';
    const model = request.model ?? 'gpt-4o-mini';
    const response = await requestJson<OpenAIResponse>(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: jsonHeaders(credential.apiKey),
      body: JSON.stringify({ model, messages: request.messages })
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned an empty response');
    return {
      content,
      model: response.model ?? model,
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens
      }
    };
  }
}
