import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSynthesisAgent } from '../src/providers/synthesis-preference.js';

function result(name: string, provider: string, success: boolean, role: string = 'general') {
  return { agent: { id: name, name, provider, role, createdAt: new Date(0).toISOString() }, content: name, success };
}

test('final synthesis selects a successful real provider before a successful reviewer mock', () => {
  const selected = selectSynthesisAgent([
    result('reviewer', 'mock', true, 'reviewer'),
    result('chatgpt-agent', 'openai', true)
  ]);
  assert.equal(selected?.name, 'chatgpt-agent');
});

test('final synthesis ignores failed real providers', () => {
  const selected = selectSynthesisAgent([
    result('chatgpt-agent', 'openai', false),
    result('reviewer', 'mock', true, 'reviewer')
  ]);
  assert.equal(selected?.name, 'reviewer');
});
