# AgentMesh

AgentMesh is a provider-agnostic multi-agent orchestration platform for the terminal. It lets you connect multiple AI providers (OpenAI, Anthropic, Gemini, Mock), keep shared project context, switch agents without losing state, delegate tasks, execute real workspace file tools, communicate over an agent message bus, and collaborate directly with Git and GitHub.

## Core Architecture

«Connect multiple AI agents → give them shared project context and controlled workspace access → allow them to communicate, delegate, review, and build together.»

- **Multi-Agent Orchestration**: Agents work together inside a shared workspace.
- **Provider Tool Loop**: Automated tool-calling loop (list, read, write, search, move files, run tests, execute commands) for OpenAI, Anthropic, Gemini, and Mock.
- **Agent Message Bus**: Internal publish/subscribe messaging system for direct messages, broadcast events, task delegation, and review requests.
- **Shared Task System**: Task queue with dependencies, status tracking, and review lifecycle.
- **Conflict Management**: Concurrent file write detection and resolution policies.
- **Capability-Based Permissions**: Granular permissions (`read`, `write`, `execute`, `git`, `github`, `network`) with strict and autonomous modes.
- **GitHub Integration**: First-class GitHub support (login, repos, clone, branch, PR, issues, CI check) accessible both via CLI and as agent tools.
- **Termux & Mobile Ready**: 100% compatible with Termux and standard Linux/macOS terminals without any GUI dependencies.

## Quick start

```bash
git clone https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js init my-project
cd my-project
node ../dist/index.js
```

The last command opens the AI-first interactive terminal. Once you are inside, normal text is sent directly to the active agent; slash commands control the workspace.

## AI-first interactive terminal

Talk to AgentMesh as a collaborative team:

```text
╭──────────────────────────────────────────╮
│               AGENTMESH                  │
│          AI Multi-Agent Terminal         │
│                                          │
│ Project: my-project                      │
│ Agents: 3  Context: 8  Git: main  GitHub: ✓ user
╰──────────────────────────────────────────╯

You › Build authentication for this app and create a PR.

AgentMesh › Planning...
● architect    Designing JWT authentication architecture
● developer    Writing auth middleware and service
● tester       Creating test suite and verifying tests
● reviewer     Auditing security

✓ Orchestration completed.
```

### Slash commands

```text
/agents                                 List connected agents and permissions
/connect <provider> [name] [role]       Connect an agent (general, architect, developer, reviewer, tester, custom)
/switch <agent>                         Change active agent
/plan <task>                            Preview role-based workflow
/swarm <task>                           Run a multi-agent task with real tools and synthesis
/swarm --no-synthesize <task>           Run without final synthesis
/tasks                                  List project tasks
/task <id>                              View task details
/message <agent> <message>              Send direct message on the AgentMesh message bus
/delegate <agent> <task>                Delegate a subtask to another agent
/permissions                            View capability permissions
/permissions mode <strict|autonomous>   Toggle permission enforcement mode
/workspace                              Show workspace files and status
/git status | diff | commit             Workspace git operations
/github status | login | repos | pr     GitHub integration commands
/history                                Show shared project context
/status                                 Show project status, Git branch, and GitHub connection
/providers                              List available providers
/auth                                   Show authentication readiness
/login <provider>                       Start provider account login
/logout <provider>                      Log out of a provider account
/help                                   Show help
/exit                                   Leave AgentMesh
```

Normal text is always treated as conversation with the active agent.

## CLI Commands

```bash
agentmesh init [name]
agentmesh interactive                   # Launch interactive terminal UI
agentmesh providers
agentmesh connect <provider> --name <name> --role <role>
agentmesh agents
agentmesh switch <agent>
agentmesh chat "message"
agentmesh plan "task"
agentmesh swarm "task" [--agents <list>] [--no-synthesize]
agentmesh tasks [list|get <id>]
agentmesh permissions [--mode <strict|autonomous>]
agentmesh delegate <agent> <task>
agentmesh message <agent> <message>
agentmesh git status | diff | commit <msg>
agentmesh github status | login | logout | repos | clone | pr | issue
agentmesh auth
agentmesh login <provider>
agentmesh logout <provider>
agentmesh history
agentmesh status
```

## Agent Tools

Agents can autonomously request structured workspace tools:
- **Filesystem**: `list_files`, `read_file`, `write_file`, `create_file`, `mkdir`, `delete_file`, `delete_path`, `search_files`, `move_file`
- **Git**: `git_status`, `git_diff`, `git_log`, `git_branch`, `git_checkout`, `git_commit`
- **Execution**: `run_command`, `run_tests`, `run_build`
- **Coordination**: `list_agents`, `send_message`, `broadcast_message`, `delegate_task`, `get_task_status`, `request_review`
- **GitHub**: `github_list_repositories`, `github_clone`, `github_create_branch`, `github_create_pull_request`, `github_create_issue`, `github_get_issue`, `github_get_pull_request`, `github_get_ci_status`

## Security & Workspace Isolation

- Workspace access is restricted to the project root with path traversal and symbolic link escape protection.
- Secrets, tokens, and credentials are never stored in the project repository or printed to terminal logs.
- Operations are gated by agent capabilities (`read`, `write`, `execute`, `git`, `github`, `network`).

## Termux & Android Compatibility

AgentMesh runs fully on Termux (Android). It uses Node.js terminal capabilities, standard POSIX child processes, and native fetch. When `gh` CLI is installed, AgentMesh automatically leverages its authentication for GitHub workflows.

## Development & Testing

```bash
npm run check      # Type checking with TypeScript
npm test           # Run comprehensive test suite
npm run build      # Compile to dist
```