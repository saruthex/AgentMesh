import type { AccountAuthCapability } from './account-auth.js';

/**
 * Describes first-class account sign-in without exposing or requiring secret input.
 * Providers are only marked available when AgentMesh has an officially supported
 * third-party account-authentication mechanism for that provider.
 */
export function accountAuthCapabilities(): AccountAuthCapability[] {
  return [
    {
      provider: 'gemini',
      label: 'Gemini / Google',
      status: 'unavailable',
      reason: 'Direct reuse of Gemini CLI account OAuth is not permitted for third-party software.'
    },
    {
      provider: 'openai',
      label: 'ChatGPT / OpenAI',
      status: 'unavailable',
      reason: 'AgentMesh needs an officially supported third-party account-sign-in flow; it must not reuse Codex credentials.'
    },
    {
      provider: 'anthropic',
      label: 'Claude / Anthropic',
      status: 'unavailable',
      reason: 'No supported third-party account-sign-in flow is currently configured for AgentMesh.'
    }
  ];
}
