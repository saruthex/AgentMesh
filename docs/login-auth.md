# Login authentication

AgentMesh supports provider API-key authentication today. Phase 10 introduces a provider-neutral login abstraction without pretending that a ChatGPT subscription is interchangeable with OpenAI API billing.

## Security rules

- AgentMesh must never ask users for provider passwords.
- Provider login must use an official OAuth or device-authorization flow exposed for third-party applications.
- Access and refresh tokens must be stored only in a future dedicated credential store, not in project files or source control.
- A provider adapter must explicitly declare whether login authentication is supported.

## Current state

The login abstraction is present, but OpenAI, Anthropic, and Gemini login adapters are intentionally not enabled yet. This prevents us from implementing an unofficial browser-login or cookie-scraping flow.

Next implementation step: verify each provider's current official OAuth/device authorization options and wire only supported flows into AgentMesh.
