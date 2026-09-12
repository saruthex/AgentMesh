import type { AgentRecord } from '../agents/types.js';
import { executeChat } from '../providers/manager.js';
import type { ProviderMessage } from '../providers/types.js';
import type { OrchestrationResult } from './orchestrator.js';

export async function synthesizeResults(task: string, results: OrchestrationResult[]): Promise<string | undefined> {
  if (!results.length) return undefined;

  const preferred = results.find(result => result.agent.role === 'reviewer')?.agent
    ?? results[results.length - 1]?.agent;

  if (!preferred) return undefined;

  const provider = preferred.provider === 'custom' ? 'mock' : preferred.provider;
  const contributions = results
    .map(result => `[${result.agent.name} — ${result.agent.role ?? 'general'}]\n${result.content}`)
    .join('\n\n');

  const messages: ProviderMessage[] = [
    {
      role: 'system',
      content: 'You are the final synthesizer for an AgentMesh collaboration. Combine the agent contributions into one concise, practical answer. Preserve important disagreements and recommendations instead of blindly merging them.'
    },
    {
      role: 'user',
      content: `Task: ${task}\n\nAgent contributions:\n\n${contributions}`
    }
  ];

  const response = await executeChat(provider, messages, preferred.model);
  return response.content;
}
