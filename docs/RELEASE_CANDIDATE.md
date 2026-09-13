# AgentMesh Release Candidate

AgentMesh is ready for release-candidate testing when the repository and device gates below are satisfied.

## Repository gate

```bash
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

## Clean-room gate

Use a fresh project and verify initialization, status, provider discovery, agent connection and switching, persistent chat history, role-aware planning, sequential swarm execution, `--no-synthesize`, and final synthesis.

## Authentication gate

OpenAI and Anthropic account mode delegates to provider-owned CLI sessions when supported. API mode uses environment variables only. Gemini account sign-in is not implemented by reusing Gemini CLI credentials.

## Termux gate

On Android/Termux, verify that the selected provider-owned CLI is executable on the device architecture before attempting account-mode execution. `AGENTMESH_OPENAI_CLI` may select a compatible Codex executable.

## Real-provider gate

A provider-dependent release claim requires one successful real request for the authentication path being released, or an explicitly documented external blocker such as unavailable billing, missing credentials, or an unsupported device build.

Never commit or paste API keys, OAuth tokens, client secrets, passwords, browser cookies, or provider session files.
