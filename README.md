# AgentMesh

AgentMesh is a provider-agnostic multi-agent orchestration CLI for the terminal. It lets you connect multiple AI providers, keep shared project context, switch agents without losing context, and run multi-agent workflows.

## Quick start

```bash
git clone https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
npm install -g .
agentmesh init my-project
cd my-project
agentmesh
```

After the global install, `agentmesh` opens the interactive workspace directly—no `interactive` or `ui` subcommand is required. The package exposes the `agentmesh` executable through npm's `bin` field, and the CLI entrypoint is a Node executable. The app runs in a normal terminal, including Termux; no graphical interface is required.

## AI-first interactive terminal

The interactive workspace is designed for a Codex-style terminal experience: type normal language to talk to the active agent, and use slash commands for workspace control.

```text
╭──────────────────────────────────────────╮
│               AGENTMESH                  │
│          AI Multi-Agent Terminal         │
╰──────────────────────────────────────────╯
Project: my-project
Agents: 2  Context: 4

agentmesh> /connect openai architect architect
✓ Connected architect (openai, architect)

agentmesh> /connect mock reviewer reviewer
✓ Connected reviewer (mock, reviewer)

agentmesh> /switch architect
✓ Active agent: architect

agentmesh> Explain how to structure this authentication system.

architect> ...

agentmesh> /switch reviewer
✓ Active agent: reviewer

agentmesh> Review the previous answer and find security gaps.

reviewer> ...

agentmesh> /swarm Design and review the complete authentication flow.

agentmesh> /history

agentmesh> /exit
Goodbye 👋
```

Inside the workspace, normal text is conversation. The available workspace commands are:

```text
/help
/status
/agents
/providers
/auth
/connect <provider> [name] [role]
/switch <agent>
/plan <task>
/swarm <task>
/swarm --no-synthesize <task>
/history
/login <provider>
/logout <provider>
/exit
```

The legacy `/chat` form remains supported inside the workspace for compatibility. Classic non-interactive commands remain available as `agentmesh <command> ...` for scripts and automation.

Explicit interactive entrypoints are also available:

```bash
agentmesh interactive
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

OpenAI and Anthropic account authentication uses provider-owned CLIs when available. AgentMesh does not copy or store those provider credentials. Gemini account OAuth is not delegated through AgentMesh; use Gemini's own supported login flow or the Gemini API-key path.

For API-key mode, use the normal provider environment variables supported by AgentMesh. The `--api` option forces API-key execution for OpenAI/Anthropic where applicable.

## Termux

AgentMesh works in a normal Node.js terminal environment, including Termux. The interactive workspace uses Node's built-in readline support and does not require a graphical terminal package.

## Development

```bash
npm run check
npm test
npm run build
```

Do not commit API keys, OAuth secrets, or provider CLI credentials.
