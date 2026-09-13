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

The last command opens the AI-first interactive terminal. No graphical interface is required. Once you are inside, normal text is sent directly to the active agent; slash commands control the workspace.

## AI-first interactive terminal

The goal is a Codex-style terminal experience: talk to AgentMesh instead of typing `chat` before every message.

```text
╭──────────────────────────────────────────╮
│               AGENTMESH                  │
│          AI Multi-Agent Terminal         │
╰──────────────────────────────────────────╯
Project: my-project
Agents: 2  Context: 4

You › Explain how to structure this authentication system.

architect> ...

You › /agents
● architect  openai  architect  active
○ reviewer   mock      reviewer

You › /switch reviewer
✓ Active agent: reviewer

You › Review the previous answer and find security gaps.

reviewer> ...

You › /swarm Design and review the complete authentication flow.

You › /history

You › /exit
Goodbye 👋
```

### Slash commands

```text
/agents
/connect <provider> [name] [role]
/switch <agent>
/plan <task>
/swarm <task>
/swarm --no-synthesize <task>
/history
/status
/providers
/auth
/login <provider>
/logout <provider>
/help
/exit
```

Normal text is always treated as conversation. The legacy `/chat <message>` form is still accepted inside the workspace for compatibility, while the normal CLI command `agentmesh chat "..."` remains available for scripts and automation.

You can also explicitly launch the workspace with:

```bash
agentmesh interactive
# or
agentmesh ui
```

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