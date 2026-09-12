import { getProviderApiKey } from './auth.js';
import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';

export class OpenAIProviderAdapter implements ProviderAdapter {
  readonly id = 'openai';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = getProviderApiKey(this.id);
    const model = request.model ?? process.env.OPENAI_MODEL;
    if (!model) throw new Error('No OpenAI model configured. Use connect openai --model <model> or set OPENAI_MODEL.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages: request.messages })
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`OpenAI request failed: ${data?.error?.message ?? response.statusText}`);

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI returned an empty response.');

    return {
      content,
      model: data?.model ?? model,
      usage: {
        inputTokens: data?.usage?.prompt_tokens,
        outputTokens: data?.usage?.completion_tokens
      }
    };
  }
}
