import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/storage/project.js';
import { executeWorkspaceTool } from '../src/workspace/tool-executor.js';
import { getWorkspacePolicy, listWorkspace, readWorkspaceFile, writeWorkspaceFile } from '../src/workspace/files.js';

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'agentmesh-workspace-'));
  const previous = process.cwd();
  try {
    process.chdir(root);
    const project = initProject('tool-test');
    process.chdir(project);
    await run(project);
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test('workspace policy enables writes inside the project root', async () => {
  await withTempProject(async (root) => {
    assert.equal(getWorkspacePolicy().root, root);
    assert.equal(getWorkspacePolicy().allowWrite, true);
    writeWorkspaceFile('index.html', '<h1>Hello</h1>');
    assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), '<h1>Hello</h1>');
  });
});

test('agent workspace tool can create files', async () => {
  await withTempProject(async (root) => {
    const result = executeWorkspaceTool({ id: '1', name: 'write_file', arguments: { path: 'site/index.html', content: '<main>ok</main>' } });
    assert.equal(result.content, 'File written successfully.');
    assert.equal(readFileSync(join(root, 'site', 'index.html'), 'utf8'), '<main>ok</main>');
  });
});

test('workspace tools reject path traversal', async () => {
  await withTempProject(async () => {
    const result = executeWorkspaceTool({ id: '2', name: 'write_file', arguments: { path: '../outside.txt', content: 'nope' } });
    assert.match(result.content, /Tool error: Workspace access denied/);
  });
});

test('workspace tools reject symlink escapes', async () => {
  await withTempProject(async (root) => {
    const outside = join(root, '..', 'agentmesh-outside.txt');
    writeFileSync(outside, 'private');
    symlinkSync(join(root, '..'), join(root, 'escape'));

    assert.throws(() => readWorkspaceFile('escape/agentmesh-outside.txt'), /path contains a symbolic link/);
    assert.throws(() => writeWorkspaceFile('escape/agentmesh-outside.txt', 'changed'), /path contains a symbolic link/);
    assert.equal(readFileSync(outside, 'utf8'), 'private');
    rmSync(outside);
  });
});

test('workspace listings identify symbolic links without following them', async () => {
  await withTempProject(async (root) => {
    symlinkSync(join(root, '..'), join(root, 'escape'));
    assert.deepEqual(listWorkspace().find(entry => entry.path === 'escape'), { path: 'escape', type: 'symlink', size: undefined });
  });
});
