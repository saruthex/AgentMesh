import { readProjectConfig, findProjectRoot } from '../storage/project.js';
import type { AgentRecord } from '../agents/types.js';
import { addMessage, loadContext } from '../context/store.js';
import { executeChat } from '../providers/manager.js';
import type { ProviderMessage } from '../providers/types.js';

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

export async function orchestrate(task: string, selectors?: string[]): Promise<OrchestrationResult[]> {
  const agents = resolveAgents(selectors);
  const results: OrchestrationResult[] = [];

  addMessage({ role: 'user', content: `Orchestration task: ${task}` });

  for (let index = 0; index < agents.length; index++) {
    const agent = agents[index];
    const previous = results.length
      ? results.map(result => `[${result.agent.name}] ${result.content}`).join('\n')
      : '(No previous agent output.)';

    const prompt = [
      `You are agent "${agent.name}" in an AgentMesh collaboration.`,
      `Task: ${task}`,
      `You are stage ${index + 1} of ${agents.length}.`,
      'Review the shared context and previous agent output, then contribute a useful next step.',
      `Previous agent output:\n${previous}`
    ].join('\n\n');

    const history: ProviderMessage[] = [
      ...toProviderHistory(),
      { role: 'user', content: prompt }
    ];

    const provider = agent.provider === 'custom' ? 'mock' : agent.provider;
    const response = await executeChat(provider, history, agent.model);

    addMessage({ role: 'agent', content: response.content, agentId: agent.id });
    results.push({ agent, content: response.content });
  }

  return results;
}
