# AgentMesh Project State

This is the handoff record for validating and using AgentMesh from a completely clean machine or Termux environment.

## Current release baseline

**Branch:** `cleanroom-hardening`

The repository contains the validated Phase 1–10 implementation, account-login hardening, clean-room regression coverage, and release-candidate documentation. The latest real Termux validation successfully exercised the OpenAI account-login path through a provider-owned Codex session and persisted the response in project history.

## Download and run

AgentMesh is currently distributed as a GitHub source checkout. The simplest Termux workflow is:

```bash
git clone -b cleanroom-hardening https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

No global installation is required. During development, run the CLI as `node dist/index.js` from the repository or `node ~/AgentMesh/dist/index.js` from a project directory.

## Create a user project

Keep project data separate from the source checkout:

```bash
cd ~/AgentMesh
node dist/index.js init my-project
cd my-project
node ../dist/index.js status
```

If the repository is stored at another path, replace `~/AgentMesh` with that path.

Project state is stored inside `my-project/.agentmesh/`.

## First local test

The Mock provider requires no external account and is the fastest way to verify the complete AgentMesh workflow:

```bash
node ../dist/index.js connect mock -n researcher -r researcher
node ../dist/index.js connect mock -n reviewer -r reviewer
node ../dist/index.js chat "Hello AgentMesh"
node ../dist/index.js history
node ../dist/index.js plan "research and review this project"
node ../dist/index.js swarm "research and review this project" --agents researcher,reviewer
```

This validates project storage, shared context, roles, routing, collaboration, and synthesis. Mock output is deterministic and is not a real AI response.

## Real OpenAI account mode

Use the provider-owned Codex CLI login flow first:

```bash
codex login
codex login status
```

Then from an AgentMesh project:

```bash
node ../dist/index.js auth
node ../dist/index.js connect openai -n chatgpt-agent
node ../dist/index.js chat "Reply with exactly: AGENTMESH RELEASE 2026"
node ../dist/index.js history
```

Expected authentication status:

```text
✓ openai: account login ready
```

AgentMesh invokes the provider-owned CLI and does not copy or store its account credentials.

For Termux/Android, a compatible Codex executable can be selected with:

```bash
export AGENTMESH_OPENAI_CLI="/absolute/path/to/codex"
```

## API-key mode

API-key mode is separate from account mode and reads credentials only from environment variables:

```bash
export OPENAI_API_KEY="YOUR_KEY"
export ANTHROPIC_API_KEY="YOUR_KEY"
export GEMINI_API_KEY="YOUR_KEY"
```

Use `--api` when explicitly selecting the API path:

```bash
node ../dist/index.js chat "Hello" --api
```

Never put API keys in project files, GitHub issues, commits, or chat messages.

## Other providers

Anthropic account mode uses the official `claude` CLI when installed and runnable. Gemini account login is not implemented by reusing Gemini CLI credentials; Gemini developer OAuth and API-key paths are separate.

## Main commands

```text
init [name]                         Create a project
connect <provider>                  Add an agent
agents                              List connected agents
switch <agent>                      Change active agent
providers                           List available adapters
auth                                Check authentication readiness
login [provider]                    Start supported login flow
logout <provider>                   Log out/remove stored login
chat <message>                     Send a message
chat <message> --api                Force API-key mode
plan <task>                         Preview role-based workflow
swarm <task>                        Run multiple agents sequentially
swarm <task> --agents a,b           Run exact agents in order
swarm <task> --no-synthesize        Skip final synthesis
history                             Show shared project history
status                              Show project status
```

## Clean-room validation status

The automated suite currently covers:

- provider-owned account CLI registry and error handling;
- account-login readiness and authentication-mode routing;
- secure CLI output/error handling;
- full offline Phase 1–10 CLI lifecycle;
- role-aware workflow planning;
- sequential orchestration and failure isolation;
- synthesis provider selection;
- package/install metadata.

The validated Termux release-candidate run passed TypeScript checking, **31/31 tests**, production build, CLI help, fresh project creation, provider discovery, multi-agent setup, chat persistence, role planning, swarm execution, and real OpenAI account-mode execution.

## Security

Never commit or paste:

- API keys
- OAuth access or refresh tokens
- client secrets
- passwords
- browser cookies
- provider session files

AgentMesh owns project context and orchestration. Provider-specific account credentials remain with provider-owned CLI sessions; AgentMesh-managed developer OAuth credentials are stored outside project directories under `~/.agentmesh/credentials.json`.
