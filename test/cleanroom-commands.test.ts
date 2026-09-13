import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = join(process.cwd(), 'dist', 'index.js');

function run(args: string[], cwd: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env: process.env
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

test('clean project lifecycle works through the built CLI', () => {
  const parent = mkdtempSync(join(tmpdir(), 'agentmesh-cleanroom-'));
  const previousCwd = process.cwd();
  try {
    const init = run(['init', 'clean-test'], parent);
    assert.equal(init.status, 0, init.stderr || init.stdout);

    const project = join(parent, 'clean-test');
    const status = run(['status'], project);
    assert.equal(status.status, 0, status.stderr || status.stdout);
    assert.match(status.stdout, /clean-test/);

    const providers = run(['providers'], project);
    assert.equal(providers.status, 0, providers.stderr || providers.stdout);
    assert.match(providers.stdout, /mock/);
    assert.match(providers.stdout, /openai/);
    assert.match(providers.stdout, /anthropic/);
    assert.match(providers.stdout, /gemini/);

    const connect = run(['connect', 'mock', '-n', 'reviewer', '-r', 'reviewer'], project);
    assert.equal(connect.status, 0, connect.stderr || connect.stdout);

    const chat = run(['chat', 'clean-room context check'], project);
    assert.equal(chat.status, 0, chat.stderr || chat.stdout);
    assert.match(chat.stdout, /clean-room context check/);

    const history = run(['history'], project);
    assert.equal(history.status, 0, history.stderr || history.stdout);
    assert.match(history.stdout, /clean-room context check/);

    const plan = run(['plan', 'review this project'], project);
    assert.equal(plan.status, 0, plan.stderr || plan.stdout);
    assert.match(plan.stdout, /reviewer/);

    const swarm = run(['swarm', 'review this project', '--agents', 'reviewer', '--no-synthesize'], project);
    assert.equal(swarm.status, 0, swarm.stderr || swarm.stdout);
    assert.match(swarm.stdout, /Orchestration completed with 1 agent\(s\); 1 succeeded/);
  } finally {
    process.chdir(previousCwd);
    rmSync(parent, { recursive: true, force: true });
  }
});
