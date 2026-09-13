import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentRecord } from '../src/agents/types.js';
import type { OrchestrationResult } from '../src/collaboration/orchestrator.js';
import { selectSynthesisAgent } from '../src/providers/synthesis-preference.js';

function result(name: string, provider: string, role: AgentRecord['role'], success = true): OrchestrationResult {
  return {
    agent: { id: name, name, provider, role, createdAt: new Date(0).toISOString() },
    content: name,
    success
  };
}

test('synthesis selects a successful real provider before a mock reviewer', () => {
  const selected = selectSynthesisAgent([
    result('reviewer', 'mock', 'reviewer'),
    result('chatgpt-agent', 'openai', 'general')
  ]);
  assert.equal(selected?.name, 'chatgpt-agent');
});

test('synthesis skips failed real providers', () => {
  const selected = selectSynthesisAgent([
    result('chatgpt-agent', 'openai', 'general', false),
    result('reviewer', 'mock', 'reviewer')
  ]);
  assert.equal(selected?.name, 'reviewer');
});
