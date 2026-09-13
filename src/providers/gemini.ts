import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';
import { getProviderCredential } from './auth.js';
import { requestJson } from './http.js';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export class GeminiProviderAdapter implements ProviderAdapter {
  readonly id = 'gemini';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const credential = getProviderCredential('gemini');
    if (!credential?.apiKey) throw new Error('Gemini API key missing');
    const model = request.model ?? 'gemini-2.5-flash';
    const baseUrl = credential.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(credential.apiKey)}`;
    const contents = request.messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const response = await requestJson<GeminiResponse>(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const content = response.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
    if (!content) throw new Error('Gemini returned an empty response');
    return {
      content,
      model,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount
      }
    };
  }
}
