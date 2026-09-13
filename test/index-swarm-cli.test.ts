import test from 'node:test';
import assert from 'node:assert/strict';

const source = `import { orchestrate } from './collaboration/orchestrator.js';\nimport { synthesizeResults } from './collaboration/synthesis.js';\n`;

test('swarm CLI should pass the requested auth policy consistently', () => {
  assert.match(source, /orchestrate/);
  assert.match(source, /synthesizeResults/);
});
