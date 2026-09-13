import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMANDS, parseInteractiveInput, runInteractiveCommand } from '../src/interactive.js';

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

test('interactive exit commands terminate the workspace loop', async () => {
  assert.equal(await runInteractiveCommand('exit', process.cwd()), false);
  assert.equal(await runInteractiveCommand('quit', process.cwd()), false);
});

test('interactive unknown commands remain recoverable', async () => {
  assert.equal(await runInteractiveCommand('not-a-command', process.cwd()), true);
});
