import { getProviderApiKey } from './auth.js';
import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';

export class AnthropicProviderAdapter implements ProviderAdapter {
  readonly id = 'anthropic';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = getProviderApiKey(this.id);
    const model = request.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) throw new Error('No Anthropic model configured. Use connect anthropic --model <model> or set ANTHROPIC_MODEL.');

    const system = request.messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
    const messages = request.messages
      .filter(message => message.role !== 'system')
      .map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ model, max_tokens: 1024, ...(system ? { system } : {}), messages })
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Anthropic request failed: ${data?.error?.message ?? response.statusText}`);

    const content = data?.content?.filter((item: any) => item?.type === 'text').map((item: any) => item.text).join('') ?? '';
    if (!content) throw new Error('Anthropic returned an empty response.');

    return {
      content,
      model: data?.model ?? model,
      usage: {
        inputTokens: data?.usage?.input_tokens,
        outputTokens: data?.usage?.output_tokens
      }
    };
  }
}
