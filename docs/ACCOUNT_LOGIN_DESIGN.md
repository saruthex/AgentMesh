# Account Login Design

AgentMesh is moving to account-first authentication.

## User experience

The normal login command should be:

```bash
agentmesh login
```

The CLI should offer installed provider account options and open an official browser sign-in flow. Users should not paste API keys, OAuth client IDs, client secrets, access tokens, refresh tokens, browser cookies, or credentials copied from another CLI.

## Provider policy

- Gemini / Google: use an officially supported account authentication flow for independent applications. Do not reuse Gemini CLI's private OAuth/backend credentials or cached session data. Google's current Gemini CLI terms explicitly warn against third-party software directly accessing the services that power Gemini CLI. citeturn302353search2
- OpenAI / ChatGPT: account authentication must use an officially supported OpenAI developer/application authentication mechanism. A ChatGPT subscription must not be treated as an OpenAI API key or API billing account.
- Anthropic / Claude: implement account authentication only when Anthropic officially documents a third-party flow suitable for AgentMesh. Otherwise report account login as unsupported and keep API-key authentication as an advanced option.

## Credential storage

After a successful official login, AgentMesh may cache the provider-issued credential locally using its secure credential store. Project files must never contain provider secrets.

## CLI behavior

`agentmesh auth` should report both API-key readiness and account-login state without exposing secret values.

`agentmesh logout <provider>` should remove only the locally cached AgentMesh credential for that provider.

## Important limitation

AgentMesh must not implement browser-cookie extraction, browser-profile scraping, password collection, private OAuth-client reuse, or credential copying from Codex, Claude Code, Gemini CLI, or other tools.
