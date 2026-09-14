import process from 'node:process';
import { executeAccountCliWorkspace, accountCliAuthenticated } from './account-cli.js';
import type { ChatResponse, ProviderMessage } from './types.js';

/** Execute OpenAI account-backed coding work through the authenticated Codex CLI. */
export function executeOpenAIWorkspace(messages: ProviderMessage[], model?: string, cwd = process.cwd()): Promise<ChatResponse> {
  if (!accountCliAuthenticated('openai')) {
    throw new Error('OpenAI account is not authenticated. Run `agentmesh login openai` and try again.');
  }
  return executeAccountCliWorkspace('openai', messages, model, cwd);
}
