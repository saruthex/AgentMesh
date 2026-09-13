import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  accountCliProviders,
  accountCliInstalled,
  accountCliAuthenticated,
  executeAccountCli
} from '../src/providers/account-cli.js';

test('account CLI registry only exposes supported provider-owned bridges', () => {
  assert.deepEqual(accountCliProviders().sort(), ['anthropic', 'openai']);
});

test('missing account CLI is reported as unavailable rather than thrown', () => {
  const original = process.env.AGENTMESH_OPENAI_CLI;
  process.env.AGENTMESH_OPENAI_CLI = '/definitely/missing/agentmesh-codex';
  try {
    assert.equal(accountCliInstalled('openai'), false);
    assert.equal(accountCliAuthenticated('openai'), false);
  } finally {
    if (original === undefined) delete process.env.AGENTMESH_OPENAI_CLI;
    else process.env.AGENTMESH_OPENAI_CLI = original;
  }
});

test('account execution safely captures provider CLI output and errors', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentmesh-account-cli-'));
  const script = join(dir, 'fake-codex');
  writeFileSync(script, '#!/bin/sh\nprintf "ACCOUNT-OK"\n');
  chmodSync(script, 0o755);
  const original = process.env.AGENTMESH_OPENAI_CLI;
  process.env.AGENTMESH_OPENAI_CLI = script;
  try {
    const result = await executeAccountCli('openai', [{ role: 'user', content: 'hello' }], 'test-model');
    assert.equal(result.content, 'ACCOUNT-OK');
    assert.equal(result.model, 'test-model');
  } finally {
    if (original === undefined) delete process.env.AGENTMESH_OPENAI_CLI;
    else process.env.AGENTMESH_OPENAI_CLI = original;
    rmSync(dir, { recursive: true, force: true });
  }
});
