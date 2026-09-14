export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
}

export interface ToolCapableChatRequest {
  model?: string;
  messages: ProviderMessageLike[];
  tools?: ToolDefinition[];
}

export interface ProviderMessageLike {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCapableChatResponse {
  content: string;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  toolCalls?: ToolCall[];
}
