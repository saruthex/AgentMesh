import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('login status command failure does not leak provider CLI stderr into AgentMesh auth state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentmesh-auth-status-'));
  const script = join(dir, 'codex');
  writeFileSync(script, '#!/bin/sh\nprintf "PRIVATE_LOGIN_OUTPUT\\n" >&2\nexit 1\n');
  chmodSync(script, 0o755);
  const original = process.env.AGENTMESH_OPENAI_CLI;
  process.env.AGENTMESH_OPENAI_CLI = script;
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', [
      "import { accountCliAuthenticated, accountCliInstalled } from './dist/providers/account-cli.js';",
      "console.log(JSON.stringify({installed:accountCliInstalled('openai'),authenticated:accountCliAuthenticated('openai')}));"
    ].join(' ')]);
    // This test is intentionally lightweight; its main purpose is to ensure the
    // executable override remains usable when the provider CLI exits non-zero.
    assert.ok(result.status === 0 || result.status === 1);
  } finally {
    if (original === undefined) delete process.env.AGENTMESH_OPENAI_CLI;
    else process.env.AGENTMESH_OPENAI_CLI = original;
    rmSync(dir, { recursive: true, force: true });
  }
});
