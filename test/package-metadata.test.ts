import test from 'node:test';
import assert from 'node:assert/strict';
import packageJson from '../package.json' with { type: 'json' };

test('package exposes install-ready metadata', () => {
  assert.equal(packageJson.name, '@agentmesh/cli');
  assert.equal(packageJson.license, 'MIT');
  assert.deepEqual(packageJson.bin, { agentmesh: './dist/index.js' });
  assert.equal(packageJson.engines?.node, '>=20');
  assert.equal(typeof packageJson.repository?.url, 'string');
  assert.equal(typeof packageJson.homepage, 'string');
});
