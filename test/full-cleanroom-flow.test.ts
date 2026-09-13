import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cli = join(process.cwd(), 'dist', 'index.js');

function run(args: string[], cwd: string) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '' }
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test('full clean-room Phase 1-10 offline lifecycle remains usable', () => {
  const parent = mkdtempSync(join(tmpdir(), 'agentmesh-full-cleanroom-'));
  try {
    const init = run(['init', 'project'], parent);
    assert.equal(init.status, 0, init.stderr || init.stdout);
    const project = join(parent, 'project');

    for (const args of [['status'], ['agents'], ['providers'], ['auth']]) {
      const result = run(args, project);
      assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
    }

    for (const args of [
      ['connect', 'mock', '-n', 'researcher', '-r', 'researcher'],
      ['connect', 'mock', '-n', 'architect', '-r', 'architect'],
      ['connect', 'mock', '-n', 'reviewer', '-r', 'reviewer']
    ]) {
      const result = run(args, project);
      assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
    }

    let result = run(['switch', 'architect'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    result = run(['chat', 'PHASE10_CONTEXT_TOKEN'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /PHASE10_CONTEXT_TOKEN/);

    result = run(['history'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /PHASE10_CONTEXT_TOKEN/);

    result = run(['plan', 'research, architect, implement, and review this change'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /researcher/);
    assert.match(result.stdout, /architect/);
    assert.match(result.stdout, /reviewer/);

    result = run(['swarm', 'research, architect, implement, and review this change', '--agents', 'researcher,architect,reviewer', '--no-synthesize'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /3 agent\(s\)/);
    assert.match(result.stdout, /3 succeeded/);

    result = run(['swarm', 'review the shared result', '--agents', 'researcher,architect,reviewer'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Final synthesis|succeeded/);

    result = run(['logout', 'gemini'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
