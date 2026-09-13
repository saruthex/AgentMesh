import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentRecord } from '../src/agents/types.js';
import type { OrchestrationResult } from '../src/collaboration/orchestrator.js';
import { buildCollaborationContext } from '../src/collaboration/context.js';

function agent(name: string, role: AgentRecord['role']): AgentRecord {
  return { id: name, name, provider: 'mock', role, createdAt: new Date(0).toISOString() };
}

test('failed agent results are excluded from collaboration context', () => {
  const results: OrchestrationResult[] = [
    { agent: agent('first', 'general'), content: 'useful answer', success: true },
    { agent: agent('failed', 'reviewer'), content: 'failed: unavailable', success: false }
  ];

  const context = buildCollaborationContext(results.filter(result => result.success));
  assert.match(context, /useful answer/);
  assert.doesNotMatch(context, /failed: unavailable/);
});
