import type { ChatRequest, ChatResponse, ProviderAdapter } from "./types.js";

export class MockProviderAdapter implements ProviderAdapter {
  readonly id = "mock";

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const last = [...request.messages].reverse().find(message => message.role === "user");
    return {
      content: `[mock provider] Received: ${last?.content ?? ""}`,
      model: "agentmesh-mock"
    };
  }
}
