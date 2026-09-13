import type { AccountAuthCapability } from './account-auth.js';
import { accountCliAuthenticated, accountCliInstalled, accountCliProviders } from './account-cli.js';

function isTermuxArm64(): boolean {
  return process.platform === 'android' || /android/i.test(process.env.TERMUX_VERSION ?? '') || /termux/i.test(process.env.PREFIX ?? '');
}

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
      installReason: isTermuxArm64()
        ? 'Install a Termux-compatible Codex CLI build to enable ChatGPT account login.'
        : 'Install a working official Codex CLI to enable ChatGPT account login.',
      authReason: 'Complete the official Codex account login before using account authentication.'
    },
    {
      provider: 'anthropic',
      label: 'Claude / Anthropic',
      installReason: 'Install the official Claude CLI to enable Claude account login from AgentMesh.',
      authReason: 'Complete the official Claude account login before using account authentication.'
    }
  ]) {
    let installed = false;
    let authenticated = false;
    try {
      installed = configured.has(item.provider) && accountCliInstalled(item.provider);
      authenticated = installed && accountCliAuthenticated(item.provider);
    } catch {
      installed = false;
      authenticated = false;
    }

    capabilities.push({
      provider: item.provider,
      label: item.label,
      status: authenticated ? 'available' : 'unavailable',
      reason: authenticated ? undefined : installed ? item.authReason : item.installReason
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
