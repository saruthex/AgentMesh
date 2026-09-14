import { getProviderApiKey } from './auth.js';
import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderToolCall } from './types.js';

export class OpenAIProviderAdapter implements ProviderAdapter {
  readonly id = 'openai';
  readonly capabilities = { apiKeyAuth: true, oauthLogin: false, tools: true } as const;

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
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...(request.tools?.length ? { tools: request.tools } : {})
      })
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`OpenAI request failed: ${data?.error?.message ?? response.statusText}`);

    const message = data?.choices?.[0]?.message;
    const content = typeof message?.content === 'string' ? message.content : '';
    const rawToolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const toolCalls: ProviderToolCall[] = rawToolCalls.flatMap((call: any) => {
      const id = typeof call?.id === 'string' ? call.id : '';
      const name = typeof call?.function?.name === 'string' ? call.function.name : '';
      const args = typeof call?.function?.arguments === 'string' ? call.function.arguments : '{}';
      return id && name ? [{ id, name, arguments: args }] : [];
    });

    if (!content && toolCalls.length === 0) throw new Error('OpenAI returned an empty response.');

    return {
      content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      model: data?.model ?? model,
      usage: {
        inputTokens: data?.usage?.prompt_tokens,
        outputTokens: data?.usage?.completion_tokens
      }
    };
  }
}
