import test from 'node:test';
import assert from 'node:assert/strict';
import { planWorkflow } from '../src/collaboration/workflow.js';
import type { AgentRecord } from '../src/agents/types.js';

function agent(name: string, provider: string, role: AgentRecord['role']): AgentRecord {
  return { id: name, name, provider, role };
}

test('explicitly selected agents bypass role filtering', () => {
  const agents = [
    agent('chatgpt-agent', 'openai', 'general'),
    agent('reviewer', 'mock', 'reviewer')
  ];

  const selectors = ['chatgpt-agent', 'reviewer'];
  const workflow = selectors.map(name => {
    const selected = agents.find(item => item.name === name);
    assert.ok(selected);
    return { role: selected.role ?? 'general' };
  });

  assert.deepEqual(workflow.map(step => step.role), ['general', 'reviewer']);
});

test('a real-provider test task can be routed to an OpenAI general agent', () => {
  const agents = [agent('chatgpt-agent', 'openai', 'general')];
  assert.deepEqual(
    planWorkflow('Remember this exact phrase and propose a next step', agents).map(step => step.role),
    ['general']
  );
});
