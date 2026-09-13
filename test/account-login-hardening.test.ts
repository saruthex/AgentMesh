import test from 'node:test';
import assert from 'node:assert/strict';

import { accountCliProviders, accountCliInstalled, accountCliAuthenticated } from '../src/providers/account-cli.js';
import { accountLoginStatus } from '../src/auth/account-login.js';
import { executeChat } from '../src/providers/manager.js';

test('supported account providers are limited to provider-owned bridges', () => {
  assert.deepEqual(accountCliProviders(), ['anthropic', 'openai']);
  assert.equal(accountCliProviders().includes('gemini'), false);
});

test('account readiness helpers fail closed for unknown or unsupported providers', () => {
  assert.equal(accountLoginStatus('unknown'), 'unavailable');
  assert.equal(accountLoginStatus('gemini'), 'unavailable');
});

test('account execution can be exercised with a fake OpenAI CLI without touching provider credentials', async () => {
  const previousCommand = process.env.AGENTMESH_OPENAI_CLI;
  const previousPath = process.env.PATH;
  process.env.AGENTMESH_OPENAI_CLI = process.execPath;
  process.env.PATH = process.env.PATH ?? '';
  try {
    assert.equal(accountCliInstalled('openai'), true);
    assert.equal(accountCliAuthenticated('openai'), false);
  } finally {
    if (previousCommand === undefined) delete process.env.AGENTMESH_OPENAI_CLI;
    else process.env.AGENTMESH_OPENAI_CLI = previousCommand;
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
  }
});

test('account mode rejects an unavailable OpenAI account cleanly', async () => {
  const previousCommand = process.env.AGENTMESH_OPENAI_CLI;
  process.env.AGENTMESH_OPENAI_CLI = process.execPath;
  try {
    await assert.rejects(
      executeChat('openai', [{ role: 'user', content: 'test' }], { authMode: 'account', model: 'test-model' }),
      /no authenticated account CLI available|account execution failed|login status/i
    );
  } finally {
    if (previousCommand === undefined) delete process.env.AGENTMESH_OPENAI_CLI;
    else process.env.AGENTMESH_OPENAI_CLI = previousCommand;
  }
});
