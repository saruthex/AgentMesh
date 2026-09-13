import { getProviderApiKey } from './auth.js';
import { getCredential, saveCredential } from './credentials.js';
import type { ChatRequest, ChatResponse, ProviderAdapter } from './types.js';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

function oauthConfig(): { clientId?: string; clientSecret?: string; projectId?: string } {
  const clientId = process.env.GEMINI_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GEMINI_OAUTH_CLIENT_SECRET?.trim();
  const projectId = process.env.GEMINI_PROJECT_ID?.trim() ?? process.env.GOOGLE_CLOUD_PROJECT?.trim();
  return {
    ...(clientId ? { clientId } : {}),
    ...(clientSecret ? { clientSecret } : {}),
    ...(projectId ? { projectId } : {})
  };
}

async function refreshOAuthCredential(provider: string) {
  const credential = getCredential(provider);
  if (!credential?.refreshToken) return credential;
  const expiresAt = credential.expiresAt ? Date.parse(credential.expiresAt) : 0;
  if (credential.accessToken && expiresAt > Date.now() + 60_000) return credential;

  const { clientId, clientSecret } = oauthConfig();
  if (!clientId) throw new Error('Missing GEMINI_OAUTH_CLIENT_ID required to refresh the Gemini login.');

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: credential.refreshToken,
    grant_type: 'refresh_token',
    ...(clientSecret ? { client_secret: clientSecret } : {})
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json() as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Gemini token refresh failed (${response.status}).`);
  }

  const refreshed = {
    ...credential,
    accessToken: data.access_token,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    ...(data.expires_in ? { expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() } : {})
  };
  saveCredential(refreshed);
  return refreshed;
}

export class GeminiProviderAdapter implements ProviderAdapter {
  readonly id = 'gemini';
  readonly capabilities = { apiKeyAuth: true, oauthLogin: true } as const;

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const credential = await refreshOAuthCredential(this.id);
    const apiKey = credential?.accessToken ? undefined : getProviderApiKey(this.id);
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

    const url = apiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (credential?.accessToken) {
      headers.Authorization = `Bearer ${credential.accessToken}`;
      const { projectId } = oauthConfig();
      if (!projectId) throw new Error('Missing GEMINI_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) required for Gemini OAuth requests.');
      headers['x-goog-user-project'] = projectId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
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
