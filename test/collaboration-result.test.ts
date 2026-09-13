import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentRecord } from '../src/agents/types.js';
import type { OrchestrationResult } from '../src/collaboration/orchestrator.js';

function agent(name: string, role: AgentRecord['role']): AgentRecord {
  return { id: name, name, provider: 'mock', role, createdAt: new Date(0).toISOString() };
}

test('successful and failed orchestration results are distinguishable', () => {
  const results: OrchestrationResult[] = [
    { agent: agent('ok', 'general'), content: 'usable contribution', success: true },
    { agent: agent('bad', 'reviewer'), content: 'Agent failed', success: false }
  ];

  assert.equal(results.filter(result => result.success).length, 1);
  assert.equal(results.find(result => result.agent.name === 'bad')?.success, false);
});
