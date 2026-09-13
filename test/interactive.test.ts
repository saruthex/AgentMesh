import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMANDS, completeInteractiveInput, parseInteractiveInput } from '../src/interactive.js';

test('interactive mode exposes the core command set', () => {
  assert.ok(COMMANDS.includes('agents'));
  assert.ok(COMMANDS.includes('swarm'));
  assert.ok(COMMANDS.includes('login'));
  assert.ok(COMMANDS.includes('logout'));
  assert.ok(COMMANDS.includes('clear'));
  assert.ok(COMMANDS.includes('exit'));
});

test('interactive parser preserves quoted task text', () => {
  assert.deepEqual(
    parseInteractiveInput('/swarm "build an auth flow"'),
    ['/swarm', 'build an auth flow'],
  );
});

test('interactive parser handles normal text without command syntax', () => {
  assert.deepEqual(parseInteractiveInput('Explain this project structure'), ['Explain', 'this', 'project', 'structure']);
});

test('interactive completion suggests slash commands', () => {
  const [suggestions, original] = completeInteractiveInput('/sw');
  assert.equal(original, '/sw');
  assert.deepEqual(suggestions, ['/swarm']);
});

test('interactive completion ignores normal conversation text', () => {
  const [suggestions, original] = completeInteractiveInput('hello');
  assert.equal(original, 'hello');
  assert.deepEqual(suggestions, []);
});
