import { getProviderApiKey } from './auth.js';
import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderToolCall } from './types.js';

export class AnthropicProviderAdapter implements ProviderAdapter {
  readonly id = 'anthropic';
  readonly capabilities = { apiKeyAuth: true, oauthLogin: false, tools: true } as const;

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = getProviderApiKey(this.id);
    const model = request.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) throw new Error('No Anthropic model configured. Use connect anthropic --model <model> or set ANTHROPIC_MODEL.');

    const system = request.messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
    
    // Format messages for Anthropic API, handling toolCalls and tool responses
    const messages: any[] = [];
    for (const msg of request.messages) {
      if (msg.role === 'system') continue;
      if (msg.role === 'tool') {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId ?? 'tool',
              content: msg.content
            }
          ]
        });
      } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
        messages.push({
          role: 'assistant',
          content: [
            ...(msg.content ? [{ type: 'text', text: msg.content }] : []),
            ...msg.toolCalls.map(tc => {
              let parsed: any = {};
              try { parsed = JSON.parse(tc.arguments); } catch {}
              return {
                type: 'tool_use',
                id: tc.id,
                name: tc.name,
                input: parsed
              };
            })
          ]
        });
      } else {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    const tools = request.tools?.length
      ? request.tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters
        }))
      : undefined;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        ...(system ? { system } : {}),
        messages,
        ...(tools ? { tools } : {})
      })
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Anthropic request failed: ${data?.error?.message ?? response.statusText}`);

    const contentBlocks = Array.isArray(data?.content) ? data.content : [];
    const content = contentBlocks.filter((item: any) => item?.type === 'text').map((item: any) => item.text).join('') ?? '';
    const toolCalls: ProviderToolCall[] = contentBlocks
      .filter((item: any) => item?.type === 'tool_use')
      .map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        arguments: JSON.stringify(item.input ?? {})
      }));

    if (!content && toolCalls.length === 0) throw new Error('Anthropic returned an empty response.');

    return {
      content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      model: data?.model ?? model,
      usage: {
        inputTokens: data?.usage?.input_tokens,
        outputTokens: data?.usage?.output_tokens
      }
    };
  }
}
