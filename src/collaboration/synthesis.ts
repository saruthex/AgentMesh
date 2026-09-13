import { executeChat } from '../providers/manager.js';
import type { ProviderMessage } from '../providers/types.js';
import type { OrchestrationResult } from './orchestrator.js';
import { selectSynthesisAgent } from './synthesis-preference.js';

type AuthMode = 'account' | 'api';

function authModeFor(provider: string, requested: AuthMode): AuthMode {
  if (requested === 'api') return 'api';
  return provider === 'openai' || provider === 'anthropic' ? 'account' : 'api';
}

export async function synthesizeResults(task: string, results: OrchestrationResult[], requestedAuthMode: AuthMode = 'account'): Promise<string | undefined> {
  const preferred = selectSynthesisAgent(results, []);
  if (!preferred) return undefined;

  const provider = preferred.provider === 'custom' ? 'mock' : preferred.provider;
  const successfulResults = results.filter(result => result.success);
  const contributions = successfulResults
    .map(result => `[${result.agent.name} — ${result.agent.role ?? 'general'}]\n${result.content}`)
    .join('\n\n');

  const messages: ProviderMessage[] = [
    {
      role: 'system',
      content: 'You are the final synthesizer for an AgentMesh collaboration. Combine the successful agent contributions into one concise, practical answer. Prefer concrete conclusions and next steps. Do not treat failed agents as evidence or recommendations.'
    },
    {
      role: 'user',
      content: `Task: ${task}\n\nSuccessful agent contributions:\n\n${contributions}`
    }
  ];

  const response = await executeChat(provider, messages, { model: preferred.model, authMode: authModeFor(provider, requestedAuthMode) });
  return response.content;
}
