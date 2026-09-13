import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentRecord } from '../src/agents/types.js';
import type { OrchestrationResult } from '../src/collaboration/orchestrator.js';

function result(name: string, provider: string, role: AgentRecord['role'], success: boolean): OrchestrationResult {
  return {
    agent: { id: name, name, provider, role, createdAt: new Date(0).toISOString() },
    content: name,
    success
  };
}

function selectSynthesizer(results: OrchestrationResult[]): AgentRecord | undefined {
  const successful = results.filter(item => item.success);
  if (!successful.length) return undefined;
  const real = successful.find(item => item.agent.provider === 'openai' || item.agent.provider === 'anthropic');
  return real?.agent ?? successful.find(item => item.agent.role === 'reviewer')?.agent ?? successful.at(-1)?.agent;
}

test('synthesis selection prefers a successful real provider over a mock reviewer', () => {
  const selected = selectSynthesizer([
    result('chatgpt-agent', 'openai', 'general', true),
    result('reviewer', 'mock', 'reviewer', true)
  ]);
  assert.equal(selected?.name, 'chatgpt-agent');
});

test('synthesis selection ignores failed real providers', () => {
  const selected = selectSynthesizer([
    result('chatgpt-agent', 'openai', 'general', false),
    result('reviewer', 'mock', 'reviewer', true)
  ]);
  assert.equal(selected?.name, 'reviewer');
});
