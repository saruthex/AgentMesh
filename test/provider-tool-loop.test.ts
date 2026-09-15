import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/storage/project.js';
import { executeChat } from '../src/providers/manager.js';

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'agentmesh-tool-loop-'));
  const previous = process.cwd();
  try {
    process.chdir(root);
    const project = initProject('tool-loop-test');
    process.chdir(project);
    await run(project);
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test('mock provider executes real workspace tool in automated loop', async () => {
  await withTempProject(async (root) => {
    // We send a message with tool call simulation directive
    const prompt = '[TOOL_CALL: write_file {"path": "generated.txt", "content": "hello world from agent"}]';
    const response = await executeChat('mock', [{ role: 'user', content: prompt }], {
      enableWorkspaceTools: true,
      authMode: 'api'
    });

    assert.ok(response.content.includes('File written successfully.'));
    const written = readFileSync(join(root, 'generated.txt'), 'utf8');
    assert.equal(written, 'hello world from agent');
  });
});
