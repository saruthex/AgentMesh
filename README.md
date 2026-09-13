# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and run teams of agents through shared workflows.

## Status

🚧 Active development — multi-agent orchestration foundation.

The current development branch includes:

- project initialization and persistent project context
- multiple named agents with provider/model/role configuration
- agent switching without losing context
- provider adapters for Mock, OpenAI, Anthropic, and Gemini
- API authentication status and secure local credential storage
- provider-owned account CLI authentication for supported OpenAI/Anthropic paths
- real provider execution with transient retry handling
- role-based routing and workflow planning
- multi-agent collaboration with bounded shared context
- final synthesis of collaboration results
- official Gemini developer OAuth login with local callback handling and token refresh
- Termux-compatible provider CLI override support for OpenAI account execution
- automated workflow/role regression tests

## Clean start

AgentMesh is designed so a new user should not need to edit source code or repair generated files manually. From a fresh Termux environment, the development setup is:

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

Create a separate AgentMesh project from the repository checkout:

```bash
node dist/index.js init my-project
cd my-project
```

Then use the CLI from inside that project:

```bash
node ../dist/index.js status
node ../dist/index.js agents
node ../dist/index.js providers
```

When your source checkout is `~/AgentMesh`, the equivalent commands are:

```bash
node ~/AgentMesh/dist/index.js init my-project
cd ~/AgentMesh/my-project
node ~/AgentMesh/dist/index.js status
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

When you run `agentmesh swarm <task>` without explicitly selecting agents, AgentMesh can prioritize agents whose roles match the task. Use `--agents` when you need a specific set of agents regardless of role matching.

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

For account-authenticated providers, both orchestration stages and final synthesis explicitly use the provider account path. `--api` is currently available on `chat` when you need to force API-key execution.

## Provider authentication

API keys are read from environment variables and are not written into project files:

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GEMINI_API_KEY="..."
agentmesh auth
```

### Account login

AgentMesh can delegate sign-in and execution to provider-owned CLIs where a compatible account-login path is available. AgentMesh does not copy, scrape, or store those provider CLI credentials.

Current account CLI bridges:

- **OpenAI:** delegates to the `codex` CLI and its ChatGPT account session. On Android/Termux, use a compatible Codex CLI build and optionally point AgentMesh at it with `AGENTMESH_OPENAI_CLI=/absolute/path/to/codex`.
- **Anthropic:** delegates to the `claude` CLI when it is available.
- **Gemini:** AgentMesh does not piggyback on Gemini CLI account OAuth. Use Gemini's supported developer/API authentication path instead.

OpenAI example:

```bash
codex login
codex login status
agentmesh auth
agentmesh chat "Hello from my signed-in ChatGPT account"
```

Log out through the same provider-owned session:

```bash
agentmesh logout openai
```

> ChatGPT login and OpenAI API billing are separate systems. A ChatGPT subscription does not automatically provide OpenAI API credits.

### Gemini developer OAuth

AgentMesh supports a separate developer OAuth flow for Gemini with PKCE, a local callback, secure local credential storage, and refresh-token support. It is intentionally distinct from Gemini CLI account credentials.

Configure a Google Cloud project with the required Generative Language API access and a Desktop OAuth client, then set the OAuth configuration locally:

```bash
export GEMINI_OAUTH_CLIENT_ID="..."
export GEMINI_OAUTH_CLIENT_SECRET="..."
export GEMINI_PROJECT_ID="..."
```

Then authenticate:

```bash
agentmesh login gemini --developer-oauth
```

On Termux, use `--no-browser` when you want to open the authorization URL yourself:

```bash
agentmesh login gemini --developer-oauth --no-browser
```

Secrets and tokens must never be pasted into source code, project files, commits, or chat.

## Authentication status

```bash
agentmesh auth
```

This reports provider API-key readiness and account-login readiness without exposing secret values.

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

Implementation work is currently being hardened on `integration-hardening`. Historical phase branches remain available for the earlier milestones.

See [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the implementation snapshot, authentication model, and validation expectations.
