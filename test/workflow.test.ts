import test from 'node:test';
import assert from 'node:assert/strict';
import { planWorkflow } from '../src/collaboration/workflow.js';
import type { AgentRecord } from '../src/agents/types.js';

function agent(name: string, role: AgentRecord['role']): AgentRecord {
  return { id: name, name, provider: 'mock', role };
}

test('workflow plans only roles relevant to the task', () => {
  const agents = [
    agent('architect', 'architect'),
    agent('reviewer', 'reviewer'),
    agent('tester', 'tester'),
    agent('general', 'general')
  ];

  assert.deepEqual(
    planWorkflow('Design the system architecture and review the proposal', agents).map(step => step.role),
    ['architect', 'reviewer']
  );
});

test('workflow falls back to available specialist roles for an unclassified task', () => {
  const agents = [
    agent('researcher', 'researcher'),
    agent('developer', 'developer'),
    agent('tester', 'tester')
  ];

  assert.deepEqual(
    planWorkflow('Help me with this project', agents).map(step => step.role),
    ['researcher', 'developer', 'tester']
  );
});

test('workflow uses general role when no specialist is connected', () => {
  const agents = [agent('general', 'general')];
  assert.deepEqual(planWorkflow('Review this idea', agents).map(step => step.role), ['general']);
});
