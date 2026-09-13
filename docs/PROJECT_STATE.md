# AgentMesh Project State

This is the handoff record for validating AgentMesh from a completely clean machine or Termux environment.

## Current baseline

**Branch:** `production-hardening`

This branch is based on the clean-room hardened implementation and is the active release-candidate hardening branch.

## Implemented capabilities

### Core CLI

- initialize an AgentMesh project
- locate and load project configuration
- show project status
- persist project context/history
- connect multiple named agents
- switch the active agent without replacing shared project context

### Providers

- provider registry and adapter abstraction
- Mock provider for deterministic testing
- OpenAI adapter
- Anthropic adapter
- Gemini adapter
- provider/model selection per agent
- API-key authentication through environment variables
- provider initialization and execution manager
- transient provider retry handling
- per-agent provider failures do not destroy an entire collaboration run

### Collaboration

- roles: `general`, `researcher`, `architect`, `developer`, `reviewer`, `tester`
- role-aware routing
- workflow planning with `plan`
- sequential multi-agent collaboration with `swarm`
- explicit agent selection with `--agents`
- bounded collaboration context
- persisted shared results
- optional final synthesis
- `--no-synthesize` for individual contributions
- account-authenticated OpenAI/Anthropic swarm execution by default when supported
- explicit `--api` override for API-key execution

### Authentication

- provider authentication readiness reporting
- login adapter abstraction and registry
- AgentMesh-managed developer OAuth credential storage
- login/logout service flow
- Gemini developer OAuth with loopback callback and token refresh
- provider-owned account CLI bridge for OpenAI and Anthropic
- OpenAI provider CLI executable override through `AGENTMESH_OPENAI_CLI`
- provider-owned OpenAI logout delegation

## Credential and login policy

AgentMesh-managed credentials are stored outside project directories under `~/.agentmesh/credentials.json` with restrictive file permissions. API keys remain environment-based.

Provider-owned CLI sessions remain under provider control. AgentMesh does not copy browser cookies, passwords, session tokens, or provider CLI credentials.

Gemini account login is intentionally not delegated through Gemini CLI OAuth. Gemini developer OAuth is kept as a separate supported flow.

## Clean-start validation

From a new checkout:

```bash
git clone -b production-hardening https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

Then create and exercise a separate project:

```bash
node dist/index.js init clean-test
cd clean-test
node ../dist/index.js status
node ../dist/index.js providers
node ../dist/index.js connect mock -n researcher -r researcher
node ../dist/index.js connect mock -n reviewer -r reviewer
node ../dist/index.js switch reviewer
node ../dist/index.js chat "remember AgentMesh CLEAN ROOM 2026"
node ../dist/index.js history
node ../dist/index.js plan "research and review this project"
node ../dist/index.js swarm "use the shared context and propose the next step" --agents researcher,reviewer --no-synthesize
node ../dist/index.js swarm "use the shared context and propose the next step" --agents researcher,reviewer
```

The full user journey must work without manual TypeScript or generated-output edits.

## Account-login validation

OpenAI account mode requires a provider-compatible `codex` CLI that is already installed and authenticated through its own supported login flow. AgentMesh only invokes the provider CLI.

```bash
codex login
codex login status
node ~/AgentMesh/dist/index.js auth
```

Expected: OpenAI reports `account login ready` when the selected CLI reports a valid account session.

For Android/Termux compatibility, the executable may be selected with:

```bash
export AGENTMESH_OPENAI_CLI="/absolute/path/to/codex"
```

Then connect and use the normal AgentMesh chat/swarm commands. Do not paste API keys or login secrets into the shell transcript or chat.

Anthropic account mode follows the same provider-owned CLI principle using `claude` when installed and runnable.

## Gemini developer OAuth validation

The separate developer OAuth flow requires provider configuration supplied locally and should never be committed. A missing configuration must produce an actionable message rather than a Node stack trace.

## Release gate

The release candidate is not considered production-ready until a clean environment passes:

1. `npm install`
2. `npm run check`
3. `npm test`
4. `npm run build`
5. `node dist/index.js --help`
6. clean project init/status/providers/connect/switch/chat/history/plan/swarm
7. account-auth readiness and logout behavior where the provider CLI is available
8. real provider execution where valid authentication and billing are available

A provider billing or account prerequisite must remain an explicit external prerequisite; it must never be hidden by a fallback that silently changes the requested authentication mode.
