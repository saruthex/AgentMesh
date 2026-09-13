# Login authentication

AgentMesh supports two distinct authentication paths:

1. **Provider account/CLI login** for OpenAI and Anthropic, delegated to their official provider-owned CLIs.
2. **Developer API-key authentication** for providers that expose API access through environment variables.

AgentMesh does not treat a ChatGPT, Claude, or Gemini subscription as interchangeable with provider API billing.

## Security rules

- AgentMesh must never ask users for provider passwords.
- AgentMesh must never scrape browser cookies, browser profiles, private CLI credential files, access tokens, or refresh tokens from another application.
- Provider account login is delegated to the provider's own official CLI where supported.
- AgentMesh does not copy or persist credentials owned by the provider CLI.
- API keys are read from environment variables and are never written to project files.
- Provider login adapters must explicitly declare whether a supported account-authentication mechanism exists.

## Current account-login implementation

### OpenAI / ChatGPT

AgentMesh delegates account login and account-backed execution to the official Codex CLI when `codex` is installed and available on `PATH`. The normal command is:

```text
agentmesh login openai
```

AgentMesh invokes the provider CLI's own login flow and does not import its credentials.

### Anthropic / Claude

AgentMesh delegates account-backed execution to the official Claude CLI when `claude` is installed and available on `PATH`. The normal command is:

```text
agentmesh login anthropic
```

AgentMesh invokes the provider CLI's own login flow and does not import its credentials.

### Gemini / Google

Gemini account OAuth is **not** delegated through AgentMesh. Google restricts third-party software from piggybacking on Gemini CLI OAuth/backend services. Users should sign in through Gemini CLI itself or use a supported Gemini API/Vertex authentication path directly in AgentMesh.

## API-key path

The API path remains explicit and independent from account login:

```text
agentmesh chat "hello" --api
```

This forces AgentMesh to use the provider API adapter rather than an available provider account CLI.

## Status

`agentmesh auth` performs runtime capability detection. OpenAI and Anthropic account login are reported as available only when their official CLI is installed and runnable. Gemini account login remains unavailable by design.
