import test from 'node:test';
import assert from 'node:assert/strict';
import { agentRoles } from '../src/agents/registry.js';

test('agent roles expose the supported collaboration roles', () => {
  assert.deepEqual(agentRoles, ['general', 'researcher', 'architect', 'developer', 'reviewer', 'tester']);
});
