import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/storage/project.js';
import { messageBus, AgentMessage } from '../src/collaboration/messageBus.js';

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'agentmesh-bus-test-'));
  const previous = process.cwd();
  try {
    process.chdir(root);
    const project = initProject('bus-test');
    process.chdir(project);
    await run(project);
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test('message bus sends direct messages and broadcasts', async () => {
  await withTempProject(async (root) => {
    messageBus.clear(root);

    const received: AgentMessage[] = [];
    const unsubscribe = messageBus.subscribe(msg => received.push(msg));

    const msg1 = messageBus.sendMessage({
      from: 'architect',
      to: 'coder',
      type: 'task',
      content: 'Design auth API'
    }, root);

    assert.equal(msg1.from, 'architect');
    assert.equal(msg1.to, 'coder');
    assert.equal(msg1.type, 'task');

    const msg2 = messageBus.broadcastMessage('coder', 'Implementation finished', 'task-123', undefined, root);
    assert.equal(msg2.to, 'broadcast');
    assert.equal(msg2.taskId, 'task-123');

    assert.equal(received.length, 2);

    const coderMessages = messageBus.getMessages({ to: 'coder' }, root);
    // Should include direct to coder + broadcast
    assert.equal(coderMessages.length, 2);

    const taskMessages = messageBus.getMessages({ taskId: 'task-123' }, root);
    assert.equal(taskMessages.length, 1);
    assert.equal(taskMessages[0]?.content, 'Implementation finished');

    unsubscribe();
  });
});
