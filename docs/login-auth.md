# Login authentication

AgentMesh supports provider API-key authentication today. Phase 10 introduces a provider-neutral login abstraction without pretending that a ChatGPT subscription is interchangeable with OpenAI API billing.

## Security rules

- AgentMesh must never ask users for provider passwords.
- Provider login must use an official OAuth or device-authorization flow exposed for third-party applications.
- Access and refresh tokens must be stored only in a future dedicated credential store, not in project files or source control.
- A provider adapter must explicitly declare whether login authentication is supported.

## Verified provider direction

- OpenAI currently documents **Sign in with ChatGPT** as an identity-provider sign-in for supported external applications. That flow provides identity information to participating applications; it does not grant an application access to ChatGPT conversations, tokens, or API billing/usage. AgentMesh therefore must not treat ChatGPT sign-in as OpenAI API authorization.
- Gemini documents OAuth for the Gemini API using a Google Cloud OAuth client and user authorization. This is a valid candidate for a provider login adapter.
- Anthropic login must only be implemented after an official third-party OAuth/device authorization mechanism suitable for this CLI is verified.

## Current implementation state

The provider login abstraction is defined, but provider login adapters are not enabled yet. This avoids unofficial browser-login or cookie-scraping implementations.

The next implementation step is to add a secure credential-store interface and then implement only provider flows that are officially supported for third-party applications.