import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepoSlug } from '../src/github/client.js';
import { getGitHubToken, saveGitHubToken, removeGitHubToken, verifyGitHubToken } from '../src/github/auth.js';
import { executeWorkspaceTool } from '../src/workspace/tool-executor.js';

test('parseRepoSlug parses shorthand and full URLs correctly', () => {
  assert.deepEqual(parseRepoSlug('saruthex/AgentMesh'), { owner: 'saruthex', repo: 'AgentMesh' });
  assert.deepEqual(parseRepoSlug('https://github.com/saruthex/AgentMesh.git'), { owner: 'saruthex', repo: 'AgentMesh' });
  assert.deepEqual(parseRepoSlug('git@github.com:saruthex/AgentMesh.git'), { owner: 'saruthex', repo: 'AgentMesh' });
  assert.throws(() => parseRepoSlug('invalid-format'), /Invalid repository format/);
});

test('github tools reject without authentication', () => {
  const previous = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    // If gh auth is mocked or no token
    const res = executeWorkspaceTool({ id: 'gh-1', name: 'github_get_issue', arguments: { repo: 'fake/repo', issueNumber: 1 } });
    assert.ok(res.content.includes('Tool error'));
  } finally {
    if (previous !== undefined) process.env.GITHUB_TOKEN = previous;
  }
});
