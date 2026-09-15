import test from 'node:test';
import assert from 'node:assert/strict';
import { isGitRepo, getGitStatus, getGitDiff, getGitLog } from '../src/git/client.js';
import { executeWorkspaceTool } from '../src/workspace/tool-executor.js';

test('git client recognizes current repo status and log', () => {
  const isRepo = isGitRepo(process.cwd());
  assert.equal(isRepo, true);

  const status = getGitStatus(process.cwd());
  assert.equal(status.isRepo, true);
  assert.ok(typeof status.branch === 'string');

  const logs = getGitLog(process.cwd(), 3);
  assert.ok(Array.isArray(logs));
  assert.ok(logs.length > 0);
  assert.ok(logs[0]?.hash);
  assert.ok(logs[0]?.author);
});

test('git tools through executeWorkspaceTool', () => {
  const result = executeWorkspaceTool({ id: 'git-1', name: 'git_status', arguments: {} });
  assert.ok(result.content.includes('isRepo'));
  assert.ok(result.content.includes('true'));
});
