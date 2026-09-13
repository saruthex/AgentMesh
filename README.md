# AgentMesh

AgentMesh is a provider-agnostic multi-agent orchestration CLI for the terminal. It lets you connect multiple AI providers, keep shared project context, switch agents without losing context, and run multi-agent workflows.

## Quick start

```bash
git clone -b interactive-terminal-ui https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js init my-project
cd my-project
node ../dist/index.js
```

The last command opens the interactive terminal workspace. No graphical interface is required.

## Interactive terminal

Inside a project, run `agentmesh` (or `node ../dist/index.js`) to get a persistent prompt:

```text
╭──────────────────────────────────────────╮
│               AGENTMESH                  │
│        Multi-Agent Terminal Workspace    │
╰──────────────────────────────────────────╯
Project: my-project
Agents: 2  Context: 4

agentmesh> agents
agentmesh> switch architect
agentmesh> chat
agentmesh> plan "build authentication"
agentmesh> swarm "design the authentication flow"
agentmesh> history
agentmesh> exit
```

You can also explicitly launch it with:

```bash
agentmesh interactive
# or
agentmesh ui
```

The existing non-interactive commands remain available, so scripts and automation are not affected.

## Core commands

```bash
agentmesh init [name]
agentmesh providers
agentmesh connect <provider> --name <name> --role <role>
agentmesh agents
agentmesh switch <agent>
agentmesh chat "hello"
agentmesh plan "your task"
agentmesh swarm "your task"
agentmesh history
agentmesh auth
agentmesh login <provider>
agentmesh logout <provider>
```

Supported provider adapters currently include `mock`, `openai`, `anthropic`, and `gemini`.

## Account authentication

OpenAI and Anthropic account authentication uses their provider-owned CLIs when available. AgentMesh does not copy or store those provider credentials. Gemini account OAuth is not delegated through AgentMesh; use Gemini's own supported login flow or the Gemini API-key path.

## Termux

AgentMesh is designed to work in a normal Node.js terminal environment, including Termux. The interactive workspace uses Node's built-in readline support and does not require a graphical terminal package.

## Development

```bash
npm run check
npm test
npm run build
```

Do not commit API keys, OAuth secrets, or provider CLI credentials.