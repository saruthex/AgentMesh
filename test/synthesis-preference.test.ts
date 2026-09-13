import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSynthesisAgent } from '../src/collaboration/synthesis-preference.js';
import type { AgentRecord } from '../src/agents/types.js';
import type { OrchestrationResult } from '../src/collaboration/orchestrator.js';

function agent(id: string, provider: string, role: AgentRecord['role'] = 'general'): AgentRecord {
  return { id, name: id, provider, role, createdAt: new Date().toISOString() };
}

function result(agentValue: AgentRecord, success = true): OrchestrationResult {
  return { agent: agentValue, content: agentValue.name, success };
}

test('synthesis prefers a successful real provider over a reviewer mock', () => {
  const mockReviewer = agent('reviewer', 'mock', 'reviewer');
  const openaiAgent = agent('chatgpt-agent', 'openai', 'general');
  assert.equal(selectSynthesisAgent([result(mockReviewer), result(openaiAgent)], []), openaiAgent);
});

test('synthesis ignores failed real providers', () => {
  const failedOpenAI = agent('failed-openai', 'openai', 'general');
  const mockReviewer = agent('reviewer', 'mock', 'reviewer');
  assert.equal(selectSynthesisAgent([result(failedOpenAI, false), result(mockReviewer)], []), mockReviewer);
});

test('synthesis falls back to reviewer when no real provider succeeded', () => {
  const reviewer = agent('reviewer', 'mock', 'reviewer');
  const tester = agent('tester', 'mock', 'tester');
  assert.equal(selectSynthesisAgent([result(tester), result(reviewer)], []), reviewer);
});
