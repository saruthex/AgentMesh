import assert from 'node:assert/strict';
import test from 'node:test';
import { executeChat } from '../src/providers/manager.js';

test('workspace tool requests do not fall through to account CLI auth', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(
      () => executeChat('openai', [{ role: 'user', content: 'create index.html' }], {
        authMode: 'auto',
        enableWorkspaceTools: true
      }),
      /workspace file tools require a tool-capable API connection|Missing OPENAI_API_KEY/
    );
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('account-mode workspace errors name the selected provider', async () => {
  await assert.rejects(
    () => executeChat('anthropic', [{ role: 'user', content: 'create index.html' }], {
      authMode: 'account',
      enableWorkspaceTools: true
    }),
    /anthropic account mode is not available/
  );
});
