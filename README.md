# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and run teams of agents through shared workflows.

## Status

🚧 Active development — multi-agent orchestration foundation.

The current development baseline includes:

- project initialization and persistent project context
- multiple named agents with provider/model/role configuration
- agent switching without losing project context
- provider adapters for Mock, OpenAI, Anthropic, and Gemini
- provider authentication status and secure local credential storage
- real provider execution with transient retry handling
- role-based routing and workflow planning
- multi-agent collaboration with bounded shared context
- final synthesis of collaboration results
- official Gemini OAuth login with local callback handling and token refresh

## Clean start

AgentMesh is designed so a new user should not need to edit source code or repair generated files manually. From a fresh Termux environment, the expected setup is:

```bash
git clone -b phase-10-login-auth https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm run build
node dist/index.js --help
```

For development, the CLI can be run directly from the repository with `node dist/index.js`. A globally installed package is not required.

Create a separate AgentMesh project anywhere you want:

```bash
node ~/AgentMesh/dist/index.js init my-project
cd ~/my-project
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
agentmesh logout <provider>
agentmesh chat <message>
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

When you run `agentmesh swarm <task>` without explicitly selecting agents, AgentMesh can prioritize agents whose roles match the task. For example, architecture tasks prioritize `architect` agents and review tasks prioritize `reviewer` agents.

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

API keys are read from environment variables and are not written into project files:

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GEMINI_API_KEY="..."
agentmesh auth
```

### Login authentication

AgentMesh also supports official provider login flows where the provider exposes a supported OAuth/device flow. It does **not** scrape passwords, browser cookies, ChatGPT sessions, or private browser state.

Currently implemented:

- **Gemini:** official Google OAuth with PKCE, local callback, secure local credential storage, and refresh-token support.

Configure a Google Cloud project with the Generative Language API enabled and a Desktop OAuth client, then set the OAuth client/project configuration locally:

```bash
export GEMINI_OAUTH_CLIENT_ID="..."
export GEMINI_OAUTH_CLIENT_SECRET="..."
export GEMINI_PROJECT_ID="..."
```

Then authenticate:

```bash
agentmesh login gemini
```

On Termux, AgentMesh attempts to open the authorization URL with `termux-open-url`. If automatic browser opening is unavailable:

```bash
agentmesh login gemini --no-browser
```

The CLI waits for the local OAuth callback and stores the resulting credential under the user's AgentMesh credential store. Secrets and tokens must never be pasted into source code, project files, commits, or chat.

> ChatGPT login and OpenAI API billing are separate systems. A ChatGPT subscription does not automatically provide OpenAI API credits.

## Authentication status

```bash
agentmesh auth
```

This reports provider API-key readiness and installed login adapters without exposing secret values.

## Development

```bash
npm install
npm run check
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

The repository contains the implementation history on its phase branches. The current development baseline is `phase-10-login-auth`.

See [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the implementation snapshot, clean-start procedure, authentication model, and validation expectations.
