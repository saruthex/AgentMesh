import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../storage/project.js';

export interface ContextMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentId?: string;
  timestamp: string;
}

function contextPath(root: string): string {
  return path.join(root, '.agentmesh', 'memory', 'context.json');
}

export function loadContext(): ContextMessage[] {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const file = contextPath(root);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ContextMessage[];
}

export function addMessage(message: Omit<ContextMessage, 'id' | 'timestamp'>): ContextMessage {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const messages = loadContext();
  const record: ContextMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
  messages.push(record);
  fs.writeFileSync(contextPath(root), JSON.stringify(messages, null, 2) + '\n');
  return record;
}
