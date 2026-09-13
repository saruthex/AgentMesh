import type { AgentRecord } from '../agents/types.js';
import type { OrchestrationResult } from '../collaboration/orchestrator.js';

export function selectSynthesisAgent(
  results: OrchestrationResult[],
  preferredAgentNames: string[] = []
): AgentRecord | undefined {
  const successful = results.filter(result => result.success);
  if (!successful.length) return undefined;

  for (const name of preferredAgentNames) {
    const preferred = successful.find(result => result.agent.name === name || result.agent.id === name);
    if (preferred) return preferred.agent;
  }

  const realProvider = successful.find(result => result.agent.provider === 'openai' || result.agent.provider === 'anthropic');
  if (realProvider) return realProvider.agent;

  return successful.find(result => result.agent.role === 'reviewer')?.agent ?? successful.at(-1)?.agent;
}
