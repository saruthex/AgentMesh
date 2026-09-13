# Account Sign-In

AgentMesh's primary authentication UX is account-based sign-in rather than asking users to paste API keys.

```text
agentmesh login
```

The CLI should present provider choices, open the provider's official sign-in page in the user's browser, wait for completion, and store only the credential material that the provider officially returns to AgentMesh.

## Rules

- Never ask users to paste API keys, OAuth client IDs, client secrets, access tokens, refresh tokens, browser cookies, or session files for the normal account-login path.
- Never read or extract credentials from another CLI's installation or browser profile.
- Never reuse private OAuth credentials belonging to another CLI or first-party application.
- Keep API-key authentication only as an explicit advanced/developer path.
- A provider must expose a supported third-party account-authentication flow before AgentMesh implements it.
- When a provider does not permit third-party account authentication, AgentMesh must report that clearly instead of providing an unofficial workaround.

## Target providers

### Google / Gemini

Use an official Google-supported OAuth/account flow that AgentMesh is allowed to use as a third-party client. Do not depend on Gemini CLI's private credentials or browser state.

### OpenAI / ChatGPT

Use an official OpenAI-supported sign-in flow when available for third-party applications. Do not treat a ChatGPT subscription as an OpenAI API key, and do not copy credentials from Codex.

### Anthropic / Claude

Use an official Anthropic-supported third-party account-authentication flow when available. Until such a flow is publicly supported for AgentMesh's use case, show account login as unavailable and retain API-key authentication as the advanced option.

## Desired CLI experience

```text
$ agentmesh login

? Choose your AI account
  Gemini / Google
  ChatGPT / OpenAI
  Claude / Anthropic

Opening browser...
✓ Authentication complete
✓ Account connected

$ agentmesh auth
✓ Gemini — account connected
✓ OpenAI — account connected
○ Anthropic — account login unavailable
```

The CLI must never print or request secret credential values.