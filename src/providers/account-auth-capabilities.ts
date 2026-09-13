import type { AccountAuthCapability } from './account-auth.js';

/**
 * First-class account sign-in is separate from developer API-key auth.
 * A provider is marked available only when AgentMesh has a provider-approved
 * third-party account-authentication mechanism. AgentMesh must never reuse
 * another CLI's credentials, cookies, browser profiles, or private OAuth data.
 */
export function accountAuthCapabilities(): AccountAuthCapability[] {
  return [
    {
      provider: 'gemini',
      label: 'Gemini / Google',
      status: 'unavailable',
      reason: 'AgentMesh cannot reuse Gemini CLI account credentials. A provider-approved third-party account flow is required.'
    },
    {
      provider: 'openai',
      label: 'ChatGPT / OpenAI',
      status: 'unavailable',
      reason: 'AgentMesh cannot reuse Codex or ChatGPT session credentials. A provider-approved third-party account flow is required.'
    },
    {
      provider: 'anthropic',
      label: 'Claude / Anthropic',
      status: 'unavailable',
      reason: 'No provider-approved third-party account sign-in flow is configured for AgentMesh.'
    }
  ];
}
