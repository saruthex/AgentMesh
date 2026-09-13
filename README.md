# AgentMesh

AgentMesh is a provider-agnostic multi-agent orchestration CLI for the terminal. It lets you connect multiple AI providers, keep shared project context, switch agents without losing context, and run multi-agent workflows.

## Install

From a checkout:

```bash
git clone https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
npm install -g .
```

This installs the `agentmesh` executable for a normal Node.js terminal. It is not Termux-specific; the interactive workspace uses Node's standard terminal APIs.

## Start AgentMesh

```bash
agentmesh init my-project
cd my-project
agentmesh
```

`agentmesh` with no arguments opens the interactive workspace directly. Explicit aliases remain available:

```bash
agentmesh interactive
agentmesh ui
```

## Interactive workspace

The interaction model follows proven coding-agent CLI patterns: natural-language conversation in the main prompt, slash commands for workspace actions, persistent session context, and visible activity while work is running. Codex uses an interactive TUI with session/thread lifecycle management; Claude Code is centered on natural-language terminal work; Gemini CLI starts an interactive REPL and exposes slash commands, input history, and completion. AgentMesh applies those interaction ideas while keeping its own provider-neutral multi-agent orchestration model. citeturn520268search0turn520268search6turn520268search3

```text
╭──────────────────────────────────────────────────────╮
│                    AGENTMESH                         │
│          Multi-Agent Terminal Workspace              │
╰──────────────────────────────────────────────────────╯
Project: my-project    Agents: 2    Context: 8
● Active: architect (openai • architect)
Type naturally to chat. Start commands with /.

You › Explain this authentication design.

⠋ Thinking…

architect (openai • 2.4s)>
...

You › /agents
● architect  openai   architect  active
○ reviewer   mock      reviewer

You › /switch reviewer
✓ Active: reviewer (mock)

You › /swarm Design and review the authentication flow.
⠋ Working…
...
⠋ Synthesizing…
...

You › /history

You › /exit
Goodbye 👋
```

### Conversation-first behavior

Normal text is always sent to the active agent. You do not type `chat` before each message.

A leading `/` means a workspace command. Slash-command names support readline completion where the terminal provides it.

The active agent and provider are shown at startup. If the active provider is `mock`, AgentMesh explicitly warns that mock is a testing adapter that echoes prompts instead of generating model responses. This prevents confusing test output with an actual AI answer.

AgentMesh shows `Thinking…`, `Working…`, or `Synthesizing…` activity while asynchronous operations run. The animation is automatically disabled when stdout is not a TTY so scripts and redirected output remain clean.

Ctrl-C is handled inside the interactive workspace instead of unexpectedly terminating the process.

## Slash commands

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
/clear
/help
/exit
```

Normal provider chat is deliberately not a slash command. `/chat` is retained only as a compatibility shortcut and points users back to normal conversation.

## Cross-terminal support

The interactive workspace is implemented with portable Node.js terminal primitives rather than a Termux-only UI layer:

- Node `readline` for input/output
- ANSI control sequences only for optional screen clearing and activity feedback
- normal stdout behavior when not attached to a TTY
- SIGINT handling inside the workspace
- no graphical dependencies

The same core interaction is intended for Termux, Linux terminals, macOS Terminal/iTerm, Windows terminals with a normal Node TTY, and non-TTY environments through the existing noninteractive commands.

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

## Development

```bash
npm run check
npm test
npm run build
```

Do not commit API keys, OAuth secrets, or provider CLI credentials.
