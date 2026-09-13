# AgentMesh Production Checklist

This checklist is the release gate for the CLI. A release candidate is not complete until the automated suite passes and the clean-room device workflow succeeds.

## Automated gate

```bash
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

## Clean-room CLI gate

Start with a fresh checkout and no existing AgentMesh project data. Validate:

1. `init` creates a project and persistent `.agentmesh` state.
2. `status`, `agents`, and `providers` work from the project directory.
3. Multiple agents can be connected and switched without losing context.
4. `chat` persists user and agent messages.
5. `history` returns persisted context.
6. `plan` selects roles for a task.
7. `swarm --no-synthesize` executes the requested sequence and persists results.
8. `swarm` performs final synthesis when a successful agent is available.
9. `auth` reports readiness without exposing secrets.
10. Missing account-login prerequisites produce actionable errors rather than stack traces.
11. Account CLI credentials remain owned by the provider CLI.
12. API mode is explicitly selectable with `--api` and never receives account CLI credentials.
13. Gemini account login is not implemented by reusing Gemini CLI credentials; the supported developer OAuth route remains separate.
14. `logout` removes or delegates logout for the selected authentication mechanism.

## Provider gate

For each provider with valid credentials and service access, exercise one real chat. For account authentication, use the provider's supported account CLI login flow. For API authentication, use environment variables only.

## Termux gate

On Android/Termux, confirm the selected OpenAI account CLI executable is runnable on the device architecture before testing AgentMesh account mode. `AGENTMESH_OPENAI_CLI` may point AgentMesh at a provider-compatible executable.

Do not paste API keys, OAuth tokens, client secrets, or session cookies into issues, chat, source files, or project configuration.

## Release decision

Release only when:

- TypeScript check passes;
- all automated tests pass;
- production build passes;
- clean-room CLI lifecycle passes;
- provider-dependent gates are either passed or blocked by a documented external prerequisite;
- no known credential-handling or authentication regression remains;
- README and project-state documentation match the actual release branch.
