# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and run teams of agents through shared workflows.

## Status

🚧 Active development — multi-agent orchestration foundation.

The current development branch is being hardenend through clean-room integration testing.

Implemented capabilities include:

- project initialization and persistent project context
- multiple named agents with provider/model/role configuration
- agent switching without losing project context
- provider adapters for Mock, OpenAI, Anthropic, and Gemini
- API-key authentication through environment variables
- account authentication through provider-owned CLI sessions where supported
- provider initialization and transient retry handling
- role-based routing and workflow planning
- multi-agent sequential collaboration with bounded shared context
- persisted collaboration results and final synthesis
- official Gemini developer OAuth with local callback handling and token refresh

## Clean start

From a fresh Termux environment:

```bash
git clone -b integration-hardening https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

For development, the CLI can be run directly from the repository with `node dist/index.js`. A globally installed package is not required.

Create a separate AgentMesh project:

```bash
node dist/index.js init my-project
cd my-project
```

When using a source checkout located at `~/AgentMesh`, the same project command can be run as:

```bash
node ~/AgentMesh/dist/index.js init my-project
cd ~/AgentMesh/my-project
```

Then use the CLI from inside that project:

```bash
node ~/AgentMesh/dist/index.js status
node ~/AgentMesh/dist/index.js agents
node ~/AgentMesh/dist/index.js providers
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

When running directly from a source checkout, replace `agentmesh` with `node dist/index.js`.

## Agent roles and routing

Agents can be assigned a role when connected:

```bash
agentmesh connect custom --name researcher --role researcher
agentmesh connect custom --name architect --role architect
agentmesh connect custom --name reviewer --role reviewer
```

Available roles:

- `general`
- `researcher`
- `architect`
- `developer`
- `reviewer`
- `tester`

When you run `agentmesh swarm <task>` without explicit agent selection, AgentMesh can prioritize agents whose roles match the task. Use `--agents` when you want an exact sequence regardless of role matching.

## Workflow planning

AgentMesh can inspect a task and create a role-based workflow before execution:

```bash
agentmesh plan "Analyze and review the AgentMesh architecture"
```

The planner selects available specialist roles that match the task. A planned workflow can then be executed with `agentmesh swarm <task>`.

## Multi-agent orchestration

Create multiple agents:

```bash
agentmesh connect custom --name researcher
agentmesh connect custom --name reviewer
```

Run them as a sequential collaboration:

```bash
agentmesh swarm "Analyze this project and suggest the next improvements"
```

Each stage receives the shared project context plus previous agent output. Collaboration context is bounded so long-running swarms do not endlessly duplicate the full history. Responses are persisted into AgentMesh shared memory for later agents and future commands.

By default, `swarm` also asks a final agent to synthesize the team contributions into one practical answer. Use `--no-synthesize` to inspect only the individual contributions.

## Provider authentication

### API-key mode

API keys are read from environment variables and are not written into project files:

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GEMINI_API_KEY="..."
node dist/index.js auth
```

Use `agentmesh chat ... --api` when you explicitly want the provider adapter/API-key path instead of an available account CLI session.

### Account login mode

AgentMesh can delegate account login and execution to supported provider-owned CLIs without copying their credentials into AgentMesh.

OpenAI account path:

```bash
codex login
codex login status
node dist/index.js auth
```

On Termux/Android ARM64, use a Codex CLI build that is actually runnable on the platform. AgentMesh supports the `AGENTMESH_OPENAI_CLI` environment override so the executable can be selected without hard-coding a specific distribution:

```bash
export AGENTMESH_OPENAI_CLI="/path/to/codex"
node dist/index.js auth
```

Then connect an OpenAI agent and run normal `chat`/`swarm` commands. Account mode is the default for those commands; use `--api` to force API-key mode.

Anthropic account mode delegates to the provider's `claude` CLI when it is installed and runnable.

### Gemini developer OAuth

Gemini account OAuth cannot be delegated through AgentMesh because Google prohibits third-party piggybacking on Gemini CLI OAuth/backend credentials. AgentMesh instead supports a separate developer OAuth flow:

```bash
export GEMINI_OAUTH_CLIENT_ID="..."
export GEMINI_OAUTH_CLIENT_SECRET="..."
export GEMINI_PROJECT_ID="..."
node dist/index.js login gemini --developer-oauth
```

Use `--no-browser` when automatic browser opening is unavailable. OAuth tokens are stored in the AgentMesh credential store rather than inside project files.

> ChatGPT login and OpenAI API billing are separate systems. A ChatGPT subscription does not automatically provide OpenAI API credits.

## Authentication status

```bash
node dist/index.js auth
```

This reports API-key readiness and account-login readiness without exposing secret values.

## Development

```bash
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

## Architecture

```text
CLI → AgentMesh Core → Shared Project Context
                         ├── Agent A → Provider
                         ├── Agent B → Provider
                         └── Agent C → Provider

                    ↓

              Orchestration Pipeline
```

The project context belongs to AgentMesh rather than a specific provider. Providers are replaceable execution backends; the platform owns project/session context, collaboration state, task routing, and persisted results.

## Project state

See [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the implementation snapshot, clean-start procedure, authentication model, and validation expectations.
