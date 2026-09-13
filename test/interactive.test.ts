import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMANDS, parseInteractiveInput } from '../src/interactive.js';

test('interactive mode exposes the core command set', () => {
  assert.ok(COMMANDS.includes('agents'));
  assert.ok(COMMANDS.includes('chat'));
  assert.ok(COMMANDS.includes('swarm'));
  assert.ok(COMMANDS.includes('exit'));
});

test('interactive parser preserves quoted task text', () => {
  assert.deepEqual(parseInteractiveInput('swarm "build an auth flow"'), ['swarm', 'build an auth flow']);
});

test('interactive parser handles plain commands', () => {
  assert.deepEqual(parseInteractiveInput('switch architect'), ['switch', 'architect']);
});
