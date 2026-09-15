import { readProjectConfig, findProjectRoot } from '../storage/project.js';
import type { AgentRecord, AgentRole } from '../agents/types.js';
import { addMessage, loadContext } from '../context/store.js';
import { executeChat } from '../providers/manager.js';
import type { ProviderMessage } from '../providers/types.js';
import { planWorkflow } from './workflow.js';
import { buildCollaborationContext } from './context.js';
import { createTask, completeTask, failTask } from '../tasks/manager.js';
import { messageBus } from './messageBus.js';

export interface OrchestrationResult {
  agent: AgentRecord;
  content: string;
  success: boolean;
  taskId?: string;
}

type AuthMode = 'account' | 'api';

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

function authModeFor(agent: AgentRecord, requested: AuthMode): AuthMode {
  if (requested === 'api') return 'api';
  return agent.provider === 'openai' || agent.provider === 'anthropic' ? 'account' : 'api';
}

export async function orchestrate(
  task: string,
  selectors?: string[],
  requestedAuthMode: AuthMode = 'account',
  options?: { enableTools?: boolean }
): Promise<OrchestrationResult[]> {
  const resolvedAgents = resolveAgents(selectors);
  const workflow = selectors?.length
    ? resolvedAgents.map(agent => ({ role: (agent.role ?? 'general') as AgentRole, objective: 'Contribute to the task according to your role.' }))
    : planWorkflow(task, resolvedAgents);
  const agents = workflow.flatMap(step => resolvedAgents.filter(agent => (agent.role ?? 'general') === step.role));
  const runnableAgents = agents.length ? agents : resolvedAgents;
  const results: OrchestrationResult[] = [];

  // Create parent orchestration task
  const rootTask = createTask({
    title: task,
    createdBy: 'orchestrator'
  });

  addMessage({ role: 'user', content: `Orchestration task: ${task}` });
  messageBus.broadcastMessage('orchestrator', `Orchestrating task: "${task}" across ${runnableAgents.length} agents`, rootTask.id);

  for (let index = 0; index < runnableAgents.length; index++) {
    const agent = runnableAgents[index]!;
    const previous = buildCollaborationContext(results.filter(result => result.success));

    // Create subtask in shared task manager
    const subtask = createTask({
      title: `[${agent.role ?? 'general'}] ${task}`,
      assignedTo: agent.id,
      createdBy: 'orchestrator',
      dependencies: index > 0 && results[index - 1]?.taskId ? [results[index - 1]!.taskId!] : []
    });

    messageBus.sendMessage({
      from: 'orchestrator',
      to: agent.id,
      type: 'task',
      content: `Stage ${index + 1}/${runnableAgents.length}: Work on ${task}`,
      taskId: subtask.id
    });

    const prompt = [
      `You are agent "${agent.name}" with the role "${agent.role ?? 'general'}" in an AgentMesh collaboration.`,
      `Task: ${task}`,
      `You are stage ${index + 1} of ${runnableAgents.length}.`,
      'Focus on responsibilities appropriate to your role. Review the shared context and previous successful agent output, then contribute a useful next step.',
      `Previous successful agent output:\n${previous}`
    ].join('\n\n');

    const history: ProviderMessage[] = [...toProviderHistory(), { role: 'user', content: prompt }];
    const authMode = authModeFor(agent, requestedAuthMode);
    // Enable workspace tools when requested or when auth mode is not account CLI
    const canEnableTools = options?.enableTools ?? (authMode === 'api' || (agent.provider !== 'openai' && agent.provider !== 'anthropic'));

    try {
      const response = await executeChat(providerFor(agent), history, {
        model: agent.model,
        authMode,
        enableWorkspaceTools: canEnableTools,
        agentId: agent.id,
        role: agent.role,
        taskId: subtask.id
      });
      addMessage({ role: 'agent', content: response.content, agentId: agent.id });
      completeTask(subtask.id, response.content);
      messageBus.sendMessage({
        from: agent.id,
        to: 'broadcast',
        type: 'result',
        content: response.content,
        taskId: subtask.id
      });
      results.push({ agent, content: response.content, success: true, taskId: subtask.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const content = `Agent "${agent.name}" failed: ${message}`;
      addMessage({ role: 'agent', content, agentId: agent.id });
      failTask(subtask.id, message);
      messageBus.sendMessage({
        from: agent.id,
        to: 'broadcast',
        type: 'error',
        content: message,
        taskId: subtask.id
      });
      results.push({ agent, content, success: false, taskId: subtask.id });
    }
  }

  completeTask(rootTask.id, `Completed with ${results.filter(r => r.success).length}/${results.length} agents successful`);
  return results;
}
