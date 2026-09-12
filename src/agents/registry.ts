import { AgentRecord } from './types.js';
import { findProjectRoot, readProjectConfig, writeProjectConfig } from '../storage/project.js';

export function connectAgent(provider: string, name?: string, model?: string): AgentRecord {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const config = readProjectConfig(root);
  const agent: AgentRecord = {
    id: `${provider}-${crypto.randomUUID().slice(0, 8)}`,
    name: name ?? provider,
    provider,
    model,
    createdAt: new Date().toISOString()
  };
  config.agents.push(agent);
  if (!config.activeAgent) config.activeAgent = agent.id;
  writeProjectConfig(root, config);
  return agent;
}

export function switchAgent(agentIdOrName: string): AgentRecord {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const config = readProjectConfig(root);
  const agent = config.agents.find((item) => item.id === agentIdOrName || item.name === agentIdOrName);
  if (!agent) throw new Error(`Agent not found: ${agentIdOrName}`);
  config.activeAgent = agent.id;
  writeProjectConfig(root, config);
  return agent;
}
