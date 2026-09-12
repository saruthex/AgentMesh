import { getProviderApiKey } from './auth.js';
import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';

export class GeminiProviderAdapter implements ProviderAdapter {
  readonly id = 'gemini';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = getProviderApiKey(this.id);
    const model = request.model ?? process.env.GEMINI_MODEL;
    if (!model) throw new Error('No Gemini model configured. Use connect gemini --model <model> or set GEMINI_MODEL.');

    const systemInstruction = request.messages
      .filter(message => message.role === 'system')
      .map(message => message.content)
      .join('\n');

    const contents = request.messages
      .filter(message => message.role !== 'system')
      .map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        contents
      })
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Gemini request failed: ${data?.error?.message ?? response.statusText}`);

    const content = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? '').join('') ?? '';
    if (!content) throw new Error('Gemini returned an empty response.');

    return {
      content,
      model,
      usage: {
        inputTokens: data?.usageMetadata?.promptTokenCount,
        outputTokens: data?.usageMetadata?.candidatesTokenCount
      }
    };
  }
}
