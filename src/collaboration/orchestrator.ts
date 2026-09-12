import { readProjectConfig, findProjectRoot } from '../storage/project.js';
import type { AgentRecord, AgentRole } from '../agents/types.js';
import { addMessage, loadContext } from '../context/store.js';
import { executeChat } from '../providers/manager.js';
import type { ProviderMessage } from '../providers/types.js';
import { planWorkflow } from './workflow.js';
import { buildCollaborationContext } from './context.js';

export interface OrchestrationResult {
  agent: AgentRecord;
  content: string;
}

function resolveAgents(selectors?: string[]): AgentRecord[] {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');

  const config = readProjectConfig(root);
  if (!selectors?.length) {
    if (!config.agents.length) throw new Error('No agents connected. Run: agentmesh connect <provider>');
    return config.agents;
  }

  const agents = selectors.map(selector => {
    const agent = config.agents.find(item => item.id === selector || item.name === selector);
    if (!agent) throw new Error(`Agent not found: ${selector}`);
    return agent;
  });

  return [...new Map(agents.map(agent => [agent.id, agent])).values()];
}

function toProviderHistory(): ProviderMessage[] {
  return loadContext().map(message => ({
    role: message.role === 'agent' ? 'assistant' : message.role,
    content: message.content
  }));
}

function providerFor(agent: AgentRecord): string {
  return agent.provider === 'custom' ? 'mock' : agent.provider;
}

export async function orchestrate(task: string, selectors?: string[]): Promise<OrchestrationResult[]> {
  const resolvedAgents = resolveAgents(selectors);
  const workflow = selectors?.length
    ? resolvedAgents.map(agent => ({ role: (agent.role ?? 'general') as AgentRole, objective: 'Contribute to the task according to your role.' }))
    : planWorkflow(task, resolvedAgents);
  const agents = workflow.flatMap(step => resolvedAgents.filter(agent => (agent.role ?? 'general') === step.role));
  const runnableAgents = agents.length ? agents : resolvedAgents;
  const results: OrchestrationResult[] = [];

  addMessage({ role: 'user', content: `Orchestration task: ${task}` });

  for (let index = 0; index < runnableAgents.length; index++) {
    const agent = runnableAgents[index];
    const previous = buildCollaborationContext(results);
    const prompt = [
      `You are agent "${agent.name}" with the role "${agent.role ?? 'general'}" in an AgentMesh collaboration.`,
      `Task: ${task}`,
      `You are stage ${index + 1} of ${runnableAgents.length}.`,
      'Focus on responsibilities appropriate to your role. Review the shared context and previous agent output, then contribute a useful next step.',
      `Previous agent output:\n${previous}`
    ].join('\n\n');

    const history: ProviderMessage[] = [
      ...toProviderHistory(),
      { role: 'user', content: prompt }
    ];

    try {
      const response = await executeChat(providerFor(agent), history, { model: agent.model });
      addMessage({ role: 'agent', content: response.content, agentId: agent.id });
      results.push({ agent, content: response.content });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const content = `Agent "${agent.name}" failed: ${message}`;
      addMessage({ role: 'agent', content, agentId: agent.id });
      results.push({ agent, content });
    }
  }

  return results;
}
