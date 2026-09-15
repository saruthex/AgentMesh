import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/storage/project.js';
import {
  defaultCapabilitiesForRole,
  checkPermission,
  requirePermission,
  setAgentPermissions,
  getAgentPermissions,
  getPermissionMode,
  setPermissionMode
} from '../src/permissions/manager.js';

async function withTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'agentmesh-perm-test-'));
  const previous = process.cwd();
  try {
    process.chdir(root);
    const project = initProject('perm-test');
    process.chdir(project);
    await run(project);
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test('default capabilities vary by agent role', () => {
  assert.ok(defaultCapabilitiesForRole('developer').includes('write'));
  assert.ok(defaultCapabilitiesForRole('developer').includes('execute'));
  assert.ok(defaultCapabilitiesForRole('reviewer').includes('read'));
  assert.ok(!defaultCapabilitiesForRole('reviewer').includes('write'));
  assert.ok(defaultCapabilitiesForRole('tester').includes('execute'));
});

test('checkPermission and requirePermission enforce permissions in strict mode', async () => {
  await withTempProject(async (root) => {
    assert.equal(getPermissionMode(root), 'strict');
    assert.equal(checkPermission('rev-1', 'write', 'reviewer', root), false);
    assert.equal(checkPermission('dev-1', 'write', 'developer', root), true);

    assert.throws(
      () => requirePermission('rev-1', 'write', 'write_file', 'reviewer', root),
      /Permission denied: Agent "rev-1" lacks required capability "write"/
    );
    assert.doesNotThrow(() => requirePermission('dev-1', 'write', 'write_file', 'developer', root));
  });
});

test('autonomous mode permits all operations', async () => {
  await withTempProject(async (root) => {
    setPermissionMode('autonomous', root);
    assert.equal(getPermissionMode(root), 'autonomous');
    assert.equal(checkPermission('rev-1', 'write', 'reviewer', root), true);
    assert.doesNotThrow(() => requirePermission('rev-1', 'write', 'write_file', 'reviewer', root));
  });
});

test('custom agent permissions can be saved and retrieved', async () => {
  await withTempProject(async (root) => {
    setAgentPermissions('special-1', ['read', 'network'], root);
    const perms = getAgentPermissions('special-1', 'general', root);
    assert.deepEqual(perms, ['read', 'network']);
  });
});
