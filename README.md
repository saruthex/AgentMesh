# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and run teams of agents through shared workflows.

## Current status

🚧 Active development — the core Phase 1–10 implementation is in place and is being hardened for a clean production release.

Implemented capabilities include:

- project initialization and persistent shared context
- multiple named agents with provider/model/role configuration
- agent switching without losing project context
- Mock, OpenAI, Anthropic, and Gemini provider adapters
- API-key authentication through environment variables
- provider-owned account CLI authentication for OpenAI and Anthropic where supported
- role-based workflow planning and sequential multi-agent orchestration
- bounded collaboration context and persisted results
- final synthesis with a provider-aware authentication path
- Gemini developer OAuth with local credential storage

## Clean start

From a fresh Termux environment:

```bash
git clone -b production-hardening https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

Create a separate AgentMesh project:

```bash
node dist/index.js init my-project
cd my-project
```

When using a source checkout at `~/AgentMesh`:

```bash
node ~/AgentMesh/dist/index.js init my-project
cd ~/AgentMesh/my-project
```

## Commands

```text
agentmesh init [name]
agentmesh connect <provider> --name <name> --model <model> --role <role>
agentmesh agents
agentmesh switch <agent>
agentmesh providers
agentmesh auth
agentmesh login [provider]
agentmesh login [provider] --developer-oauth
agentmesh logout <provider>
agentmesh chat <message>
agentmesh chat <message> --api
agentmesh plan <task>
agentmesh swarm <task>
agentmesh swarm <task> --agents agent-a,agent-b
agentmesh swarm <task> --no-synthesize
agentmesh history
agentmesh status
```

Run `node dist/index.js` instead of `agentmesh` when using the source checkout directly.

## Authentication

API-key mode reads credentials only from environment variables:

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GEMINI_API_KEY="..."
node dist/index.js auth
```

For OpenAI account mode, sign in with the provider-owned Codex CLI first:

```bash
codex login
codex login status
node dist/index.js auth
```

On Termux/Android, AgentMesh supports `AGENTMESH_OPENAI_CLI` so a compatible Codex executable can be selected without changing project configuration.

Anthropic account mode delegates to the official `claude` CLI when it is installed and runnable.

Gemini account login is not delegated through AgentMesh. Google OAuth for Gemini CLI is provider-owned; use the Gemini CLI itself for account sign-in, or use AgentMesh's separate developer OAuth/API-key paths.

ChatGPT subscriptions and OpenAI API billing are separate systems; an account login does not imply API credits.

## Architecture

```text
CLI → AgentMesh Core → Shared Project Context
                         ├── Agent A → Provider
                         ├── Agent B → Provider
                         └── Agent C → Provider

                    ↓

              Orchestration Pipeline
```

The project context belongs to AgentMesh rather than a specific provider. Providers are replaceable execution backends; the platform owns project/session context, collaboration state, routing, and persisted results.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

See `docs/PROJECT_STATE.md` for the detailed implementation snapshot and validation expectations.
