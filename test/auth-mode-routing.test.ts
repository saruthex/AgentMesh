import test from 'node:test';
import assert from 'node:assert/strict';

function authModeFor(provider: string, override?: 'account' | 'api'): 'account' | 'api' {
  if (override) return override;
  return provider === 'openai' || provider === 'anthropic' ? 'account' : 'api';
}

test('provider-aware default auth mode keeps mock on API adapter path', () => {
  assert.equal(authModeFor('mock'), 'api');
  assert.equal(authModeFor('custom'), 'api');
  assert.equal(authModeFor('openai'), 'account');
  assert.equal(authModeFor('anthropic'), 'account');
});

test('explicit swarm auth override is respected', () => {
  assert.equal(authModeFor('mock', 'api'), 'api');
  assert.equal(authModeFor('openai', 'api'), 'api');
  assert.equal(authModeFor('mock', 'account'), 'account');
});
