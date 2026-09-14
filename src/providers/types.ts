export interface ProviderMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ProviderToolCall[];
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ProviderTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  model?: string;
  messages: ProviderMessage[];
  tools?: ProviderTool[];
}

export interface ChatResponse {
  content: string;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  toolCalls?: ProviderToolCall[];
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
  tools?: boolean;
}
