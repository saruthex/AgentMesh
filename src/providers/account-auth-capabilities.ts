import type { AccountAuthCapability } from './account-auth.js';
import { accountCliAuthenticated, accountCliProviders } from './account-cli.js';

/**
 * Resolve account sign-in readiness from provider-owned CLIs at runtime.
 * AgentMesh never reads or copies provider credential stores.
 */
export function accountAuthCapabilities(): AccountAuthCapability[] {
  const capabilities: AccountAuthCapability[] = [];
  const configured = new Set(accountCliProviders());

  for (const item of [
    {
      provider: 'openai',
      label: 'ChatGPT / OpenAI',
      reason: 'Install the official Codex CLI, then complete `codex login`, to enable ChatGPT account login.'
    },
    {
      provider: 'anthropic',
      label: 'Claude / Anthropic',
      reason: 'Install the official Claude CLI to enable Claude account login from AgentMesh.'
    }
  ]) {
    let available = false;
    try {
      available = configured.has(item.provider) && accountCliAuthenticated(item.provider);
    } catch {
      available = false;
    }
    capabilities.push({
      provider: item.provider,
      label: item.label,
      status: available ? 'available' : 'unavailable',
      ...(available ? {} : { reason: item.reason })
    });
  }

  capabilities.push({
    provider: 'gemini',
    label: 'Gemini / Google',
    status: 'unavailable',
    reason: 'AgentMesh cannot reuse Gemini CLI account OAuth. Use the Gemini CLI itself for Google-account login, or use the Gemini API-key path in AgentMesh.'
  });

  return capabilities;
}
