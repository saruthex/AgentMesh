import { addMessage, loadContext, ContextMessage } from '../context/store.js';

export function sendToSharedContext(agentId: string, content: string): ContextMessage {
  return addMessage({ role: 'agent', agentId, content });
}

export function history(): ContextMessage[] {
  return loadContext();
}
