import { AnthropicProviderAdapter } from './anthropic.js';
import { GeminiOAuthAdapter } from './gemini-oauth.js';
import { GeminiProviderAdapter } from './gemini.js';
import { MockProviderAdapter } from './mock.js';
import { OpenAIProviderAdapter } from './openai.js';
import { executeAccountCli, accountCliAuthenticated } from './account-cli.js';
import { providerRegistry } from './registry.js';
import { loginRegistry } from './login-registry.js';
import type { ChatResponse, ProviderMessage, ProviderTool } from './types.js';
import { workspaceToolDefinitions, executeWorkspaceTool } from '../workspace/tool-executor.js';
import { emitActivity } from '../workspace/activity.js';

let initialized = false;

export function initializeProviders(): void {
  if (initialized) return;
  providerRegistry.register(new MockProviderAdapter());
  providerRegistry.register(new OpenAIProviderAdapter());
  providerRegistry.register(new AnthropicProviderAdapter());
  providerRegistry.register(new GeminiProviderAdapter());
  loginRegistry.register(new GeminiOAuthAdapter());
  initialized = true;
}

export interface ExecuteChatOptions {
  model?: string;
  retries?: number;
  authMode?: 'account' | 'api' | 'auto';
  enableWorkspaceTools?: boolean;
  maxToolRounds?: number;
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|500|502|503|504|network|fetch failed|timeout/i.test(message);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function canUseAccountCli(providerId: string): boolean {
  if (providerId !== 'openai' && providerId !== 'anthropic') return false;
  try { return accountCliAuthenticated(providerId); } catch { return false; }
}

function providerTools(): ProviderTool[] {
  return workspaceToolDefinitions.map(tool => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema }
  }));
}

async function chatWithWorkspaceTools(providerId: string, messages: ProviderMessage[], options: ExecuteChatOptions): Promise<ChatResponse> {
  const provider = providerRegistry.get(providerId);
  if (!provider) throw new Error(`Provider adapter not configured: ${providerId}`);
  const supportsTools = provider.capabilities?.tools === true;
  const tools = options.enableWorkspaceTools !== false && supportsTools ? providerTools() : undefined;
  const maxRounds = options.maxToolRounds ?? 12;
  let working = [...messages];

  if (options.enableWorkspaceTools !== false && !supportsTools) {
    emitActivity({ kind: 'working', message: 'Thinking…', detail: 'workspace tools unavailable for this provider' });
  }

  for (let round = 0; round <= maxRounds; round++) {
    emitActivity({ kind: 'working', message: round === 0 ? 'Thinking…' : 'Continuing work…' });
    const response = await provider.chat({ model: options.model, messages: working, tools });
    if (!response.toolCalls?.length) return response;

    working.push({ role: 'assistant', content: response.content, toolCalls: response.toolCalls });

    for (const toolCall of response.toolCalls) {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(toolCall.arguments) as Record<string, unknown>; }
      catch { parsed = {}; }
      const result = executeWorkspaceTool({ id: toolCall.id, name: toolCall.name, arguments: parsed });
      working.push({ role: 'tool', content: result.content, toolCallId: result.toolCallId });
    }
  }

  throw new Error(`Agent exceeded the maximum workspace tool rounds (${maxRounds}).`);
}

export async function executeChat(providerId: string, messages: ProviderMessage[], options: ExecuteChatOptions = {}): Promise<ChatResponse> {
  initializeProviders();
  const provider = providerRegistry.get(providerId);
  if (!provider) throw new Error(`Provider adapter not configured: ${providerId}. Available adapters: ${providerRegistry.list().join(', ')}`);

  const authMode = options.authMode ?? 'auto';
  const accountCapable = canUseAccountCli(providerId);

  if (authMode !== 'api' && accountCapable && options.enableWorkspaceTools !== true) {
    try { return await executeAccountCli(providerId, messages, options.model); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (authMode === 'account' || /login|authenticate|auth|not logged|unauthorized|credential/i.test(message)) throw error;
    }
  }

  if (authMode === 'account' && options.enableWorkspaceTools !== true) {
    throw new Error(`Provider "${providerId}" has no authenticated account CLI available. Run \`agentmesh auth\` to check account readiness, then \`agentmesh login ${providerId}\` for supported account login.`);
  }

  if (authMode === 'account' && options.enableWorkspaceTools === true && provider.capabilities?.tools !== true) {
    throw new Error(`Provider "${providerId}" account mode does not currently support AgentMesh workspace tools. Use API-key mode for file-writing tasks.`);
  }

  const retries = options.retries ?? 1;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await chatWithWorkspaceTools(providerId, messages, options);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isTransientError(error)) break;
      emitActivity({ kind: 'retry', message: 'Retrying…', detail: `attempt ${attempt + 2}` });
      await wait(500 * (attempt + 1));
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Provider "${providerId}" failed: ${message}`);
}
