import type { AgentRecord } from '../agents/types.js';
import type { OrchestrationResult } from './orchestrator.js';

export function selectSynthesisAgent(results: OrchestrationResult[], availableAgents: AgentRecord[]): AgentRecord | undefined {
  const successful = results.filter(result => result.success);
  if (!successful.length) return undefined;

  const successfulIds = new Set(successful.map(result => result.agent.id));
  const realProvider = successful.find(result => result.agent.provider === 'openai' || result.agent.provider === 'anthropic');
  if (realProvider) return realProvider.agent;

  const reviewer = successful.find(result => result.agent.role === 'reviewer');
  if (reviewer) return reviewer.agent;

  const latest = successful[successful.length - 1];
  if (latest) return latest.agent;

  return availableAgents.find(agent => successfulIds.has(agent.id));
}
