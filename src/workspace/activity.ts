export type ActivityKind = 'working' | 'tool' | 'retry' | 'done' | 'error';

export interface ActivityEvent {
  kind: ActivityKind;
  message: string;
  agent?: string;
  detail?: string;
}

export type ActivityListener = (event: ActivityEvent) => void;

const listeners = new Set<ActivityListener>();

export function subscribeActivity(listener: ActivityListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitActivity(event: ActivityEvent): void {
  for (const listener of listeners) {
    try { listener(event); } catch { /* UI listeners must never break agent execution. */ }
  }
}
