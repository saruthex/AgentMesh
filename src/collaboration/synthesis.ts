import { executeChat } from '../providers/manager.js';
import type { ProviderMessage } from '../providers/types.js';
import type { OrchestrationResult } from './orchestrator.js';

type AuthMode = 'account' | 'api';

function authModeFor(provider: string, requested: AuthMode): AuthMode {
  if (requested === 'api') return 'api';
  return provider === 'openai' || provider === 'anthropic' ? 'account' : 'api';
}

export async function synthesizeResults(task: string, results: OrchestrationResult[], requestedAuthMode: AuthMode = 'account'): Promise<string | undefined> {
  const successfulResults = results.filter(result => result.success);
  if (!successfulResults.length) return undefined;

  const preferred = successfulResults.find(result => result.agent.role === 'reviewer')?.agent
    ?? successfulResults[successfulResults.length - 1]?.agent;

  if (!preferred) return undefined;

  const provider = preferred.provider === 'custom' ? 'mock' : preferred.provider;
  const contributions = successfulResults
    .map(result => `[${result.agent.name} — ${result.agent.role ?? 'general'}]\n${result.content}`)
    .join('\n\n');

  const messages: ProviderMessage[] = [
    {
      role: 'system',
      content: 'You are the final synthesizer for an AgentMesh collaboration. Combine the successful agent contributions into one concise, practical answer. Do not treat failed agents as evidence or recommendations.'
    },
    {
      role: 'user',
      content: `Task: ${task}\n\nSuccessful agent contributions:\n\n${contributions}`
    }
  ];

  const response = await executeChat(provider, messages, { model: preferred.model, authMode: authModeFor(provider, requestedAuthMode) });
  return response.content;
}