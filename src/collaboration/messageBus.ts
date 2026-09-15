import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { addMessage, loadContext, ContextMessage } from '../context/store.js';
import { findProjectRoot, readProjectConfig } from '../storage/project.js';

export type AgentMessageType = 'message' | 'task' | 'result' | 'review' | 'error';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  projectId: string;
  taskId?: string;
  type: AgentMessageType;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

type MessageListener = (message: AgentMessage) => void;

class MessageBus {
  private listeners: Set<MessageListener> = new Set();

  private getMessagesPath(root?: string): string {
    const projectRoot = root ?? findProjectRoot(process.cwd());
    if (!projectRoot) throw new Error('No AgentMesh project found. Run `agentmesh init` first.');
    return path.join(projectRoot, '.agentmesh', 'messages.json');
  }

  loadMessages(root?: string): AgentMessage[] {
    try {
      const file = this.getMessagesPath(root);
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(data)) return data;
      }
    } catch {}
    return [];
  }

  private saveMessages(messages: AgentMessage[], root?: string): void {
    const file = this.getMessagesPath(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(messages, null, 2) + '\n', 'utf8');
  }

  sendMessage(
    params: {
      from: string;
      to: string | 'broadcast';
      type?: AgentMessageType;
      content: string;
      taskId?: string;
      metadata?: Record<string, unknown>;
    },
    root?: string
  ): AgentMessage {
    const projectRoot = root ?? findProjectRoot(process.cwd());
    const config = projectRoot ? readProjectConfig(projectRoot) : { name: 'unknown' };

    const message: AgentMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      from: params.from,
      to: params.to,
      projectId: config.name,
      taskId: params.taskId,
      type: params.type ?? 'message',
      content: params.content,
      timestamp: new Date().toISOString(),
      metadata: params.metadata
    };

    const messages = this.loadMessages(projectRoot ?? undefined);
    messages.push(message);
    this.saveMessages(messages, projectRoot ?? undefined);

    // Also add to global context store for compatibility
    addMessage({
      role: 'agent',
      agentId: params.from,
      content: `[${params.type ?? 'message'} -> ${params.to}] ${params.content}`
    });

    // Notify in-process listeners
    for (const listener of this.listeners) {
      try { listener(message); } catch {}
    }

    return message;
  }

  broadcastMessage(
    from: string,
    content: string,
    taskId?: string,
    metadata?: Record<string, unknown>,
    root?: string
  ): AgentMessage {
    return this.sendMessage({
      from,
      to: 'broadcast',
      type: 'message',
      content,
      taskId,
      metadata
    }, root);
  }

  getMessages(
    filter?: {
      to?: string;
      from?: string;
      taskId?: string;
      type?: AgentMessageType;
    },
    root?: string
  ): AgentMessage[] {
    let messages = this.loadMessages(root);
    if (filter?.to) {
      messages = messages.filter(m => m.to === filter.to || m.to === 'broadcast');
    }
    if (filter?.from) {
      messages = messages.filter(m => m.from === filter.from);
    }
    if (filter?.taskId) {
      messages = messages.filter(m => m.taskId === filter.taskId);
    }
    if (filter?.type) {
      messages = messages.filter(m => m.type === filter.type);
    }
    return messages;
  }

  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(root?: string): void {
    this.saveMessages([], root);
  }
}

export const messageBus = new MessageBus();

// Backward compatibility functions
export function sendToSharedContext(agentId: string, content: string): ContextMessage {
  messageBus.broadcastMessage(agentId, content);
  return addMessage({ role: 'agent', agentId, content });
}

export function history(): ContextMessage[] {
  return loadContext();
}
