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
  chat(request: ChatRequest): Promise<ChatResponse>;
}
