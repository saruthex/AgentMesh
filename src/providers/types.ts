export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ProviderMessage[];
}

export interface ChatResponse {
  content: string;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ProviderAdapter {
  readonly id: string;
  readonly capabilities?: ProviderCapabilities;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

export interface OAuthLoginOptions {
  port?: number;
  openBrowser?: boolean;
}

export interface OAuthLoginResult {
  provider: string;
  authenticated: boolean;
  message?: string;
}

export interface ProviderCapabilities {
  apiKeyAuth: boolean;
  oauthLogin: boolean;
}
