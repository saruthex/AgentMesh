import type { AccountAuthCapability } from './account-auth.js';
import { accountCliInstalled } from './account-cli.js';

/**
 * Account sign-in capabilities are resolved at runtime. AgentMesh delegates
 * OpenAI/Anthropic account authentication to their provider-owned CLIs and
 * never reads or copies those CLIs' credential stores.
 */
export function accountAuthCapabilities(): AccountAuthCapability[] {
  const capabilities: AccountAuthCapability[] = [];

  for (const item of [
    {
      provider: 'openai',
      label: 'ChatGPT / OpenAI',
      reason: 'Install the official Codex CLI to enable ChatGPT account login from AgentMesh.'
    },
    {
      provider: 'anthropic',
      label: 'Claude / Anthropic',
      reason: 'Install the official Claude CLI to enable Claude account login from AgentMesh.'
    }
  ]) {
    let available = false;
    try {
      available = accountCliInstalled(item.provider);
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
