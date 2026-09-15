import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderToolCall } from "./types.js";

export class MockProviderAdapter implements ProviderAdapter {
  readonly id = "mock";
  readonly capabilities = { apiKeyAuth: true, oauthLogin: false, tools: true } as const;

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const lastMsg = request.messages[request.messages.length - 1];
    if (lastMsg?.role === 'tool') {
      return {
        content: `[mock provider] Completed work with result: ${lastMsg.content}`,
        model: "agentmesh-mock"
      };
    }

    const lastUser = [...request.messages].reverse().find(message => message.role === "user");
    const lastContent = lastUser?.content ?? "";

    // Support simulated tool calling when requested in prompt
    const toolMatch = lastContent.match(/\[TOOL_CALL:\s*(\w+)(?:\s+([\s\S]*?))?\]/);
    if (toolMatch && request.tools?.length) {
      const toolName = toolMatch[1]!;
      const toolArgs = toolMatch[2]?.trim() || '{}';
      return {
        content: `Calling ${toolName}`,
        toolCalls: [{
          id: `mock-call-${Date.now()}`,
          name: toolName,
          arguments: toolArgs
        }],
        model: "agentmesh-mock"
      };
    }

    return {
      content: `[mock provider] Received: ${lastContent}`,
      model: "agentmesh-mock"
    };
  }
}
