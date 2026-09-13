# Account Authentication

AgentMesh should provide account-based browser sign-in as the normal authentication experience, similar to modern terminal agents.

## UX goal

Users run:

```bash
agentmesh login gemini
agentmesh login claude
agentmesh login chatgpt
```

The CLI opens a browser authentication flow. The user signs in with the provider account/subscription and returns to AgentMesh. Users should not normally paste API keys, OAuth client IDs, client secrets, access tokens, or refresh tokens into the terminal.

## Security boundary

AgentMesh must use only authentication flows that the provider officially makes available to third-party applications. It must not:

- scrape browser cookies or browser profiles;
- copy credentials from another CLI's private credential store;
- reuse or piggyback on another CLI's OAuth client credentials;
- reverse-engineer private provider APIs.

## Provider policy

### Gemini / Google

Google officially supports Google-account sign-in for Gemini CLI. AgentMesh must not reuse Gemini CLI OAuth tokens or credentials. A separate, officially permitted integration is required for a third-party application.

### OpenAI / ChatGPT

AgentMesh may support ChatGPT-account authentication only when OpenAI provides a supported third-party authentication flow for this use case. ChatGPT subscription access must never be represented as OpenAI API billing access.

### Anthropic / Claude

AgentMesh may support Claude-account authentication only when Anthropic officially permits the corresponding third-party flow. Do not implement an unofficial subscription-token or Claude Code credential reuse path.

## Fallback

API-key authentication remains available as an advanced/developer path where supported. It must not be the default `login` experience.

The CLI should report unsupported account authentication clearly rather than asking users to paste secrets or suggesting credential extraction workarounds.
