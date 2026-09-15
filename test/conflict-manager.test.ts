import test from 'node:test';
import assert from 'node:assert/strict';
import { conflictManager } from '../src/workspace/conflict.js';
import { executeWorkspaceTool } from '../src/workspace/tool-executor.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/storage/project.js';

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'agentmesh-conflict-test-'));
  const previous = process.cwd();
  try {
    process.chdir(root);
    const project = initProject('conflict-test');
    process.chdir(project);
    await run(project);
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test('conflict manager detects concurrent modifications by different agents', async () => {
  await withTempProject(async () => {
    conflictManager.reset();

    const write1 = conflictManager.checkOrRecordWrite('coder', 'src/auth.ts', 'const jwt = 1;', 'task-1');
    assert.equal(write1.hasConflict, false);

    // Same agent modifying again: no conflict
    const write2 = conflictManager.checkOrRecordWrite('coder', 'src/auth.ts', 'const jwt = 2;', 'task-1');
    assert.equal(write2.hasConflict, false);

    // Another agent modifying the same file: CONFLICT!
    const write3 = conflictManager.checkOrRecordWrite('reviewer', 'src/auth.ts', 'const jwt = 3;', 'task-2');
    assert.equal(write3.hasConflict, true);
    assert.ok(write3.conflict);
    assert.equal(write3.conflict.firstAgent, 'coder');
    assert.equal(write3.conflict.secondAgent, 'reviewer');

    const conflicts = conflictManager.getConflicts();
    assert.equal(conflicts.length, 1);

    const resolved = conflictManager.resolveConflict(conflicts[0]!.id, 'keep_second');
    assert.equal(resolved.resolved, true);
    assert.equal(resolved.resolution, 'keep_second');
  });
});

test('executeWorkspaceTool surfaces conflict warning on concurrent write', async () => {
  await withTempProject(async () => {
    conflictManager.reset();

    executeWorkspaceTool(
      { id: '1', name: 'write_file', arguments: { path: 'file.txt', content: 'v1' } },
      { agentId: 'agent-a', role: 'developer' }
    );

    const res = executeWorkspaceTool(
      { id: '2', name: 'write_file', arguments: { path: 'file.txt', content: 'v2' } },
      { agentId: 'agent-b', role: 'developer' }
    );

    assert.match(res.content, /Conflict detected: file was modified concurrently by agent-a/);
  });
});
