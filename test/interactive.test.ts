import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMANDS, parseInteractiveInput, runInteractiveCommand } from '../src/interactive.js';

test('interactive mode exposes the AI-first command set', () => {
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
  const project = process.cwd();
  assert.equal(await runInteractiveCommand('/exit', project), false);
  assert.equal(await runInteractiveCommand('/quit', project), false);
});

test('slash commands are recognized case-insensitively', async () => {
  assert.equal(await runInteractiveCommand('/EXIT', process.cwd()), false);
});

test('normal text is treated as conversational input and remains recoverable without an active agent', async () => {
  assert.equal(await runInteractiveCommand('build me a secure login flow', process.cwd()), true);
});

test('unknown slash commands remain recoverable', async () => {
  assert.equal(await runInteractiveCommand('/not-a-command', process.cwd()), true);
});
