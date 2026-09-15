import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/storage/project.js';
import {
  createTask,
  getTask,
  listTasks,
  updateTask,
  delegateTask,
  completeTask,
  failTask,
  requestReview,
  clearTasks
} from '../src/tasks/manager.js';

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'agentmesh-task-test-'));
  const previous = process.cwd();
  try {
    process.chdir(root);
    const project = initProject('task-test');
    process.chdir(project);
    await run(project);
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test('task manager lifecycle: create, update, delegate, complete, review', async () => {
  await withTempProject(async (root) => {
    clearTasks(root);

    const task = createTask({
      title: 'Implement OAuth',
      description: 'Build OAuth login flow',
      assignedTo: 'coder'
    }, root);

    assert.ok(task.id.startsWith('task-'));
    assert.equal(task.title, 'Implement OAuth');
    assert.equal(task.status, 'pending');
    assert.equal(task.assignedTo, 'coder');

    const fetched = getTask(task.id, root);
    assert.deepEqual(fetched, task);

    const delegated = delegateTask('coder', 'reviewer', 'Review OAuth', 'Security review', [task.id], root);
    assert.equal(delegated.assignedTo, 'reviewer');
    assert.deepEqual(delegated.dependencies, [task.id]);

    const completed = completeTask(task.id, 'OAuth implemented with JWT', root);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.result, 'OAuth implemented with JWT');

    const reviewed = requestReview(task.id, 'security-expert', root);
    assert.equal(reviewed.reviewStatus, 'pending');
    assert.equal(reviewed.reviewerId, 'security-expert');

    const allTasks = listTasks(undefined, root);
    assert.equal(allTasks.length, 2);

    const completedTasks = listTasks({ status: 'completed' }, root);
    assert.equal(completedTasks.length, 1);
  });
});
