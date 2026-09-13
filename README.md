# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and run teams of agents through shared workflows.

## Download and use

### Option 1 — clone from GitHub (recommended for Termux)

Install Node.js and Git first, then run:

```bash
git clone -b cleanroom-hardening https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
```

Verify the CLI:

```bash
node dist/index.js --help
node dist/index.js --version
```

> The repository currently ships as a source checkout. You do **not** need a global `agentmesh` command to use it.

### Option 2 — update an existing checkout

```bash
cd ~/AgentMesh
git pull
npm install
npm run check
npm test
npm run build
```

## Create your first project

Keep your project separate from the source checkout:

```bash
cd ~/AgentMesh
node dist/index.js init my-project
cd my-project
```

Then check the project:

```bash
node ~/AgentMesh/dist/index.js status
node ~/AgentMesh/dist/index.js providers
node ~/AgentMesh/dist/index.js agents
```

AgentMesh stores project state inside the project's `.agentmesh/` directory. Your source checkout and your project data stay separate.

## Quick start with a local mock agent

This needs no API key and is the fastest way to learn the CLI:

```bash
node ~/AgentMesh/dist/index.js connect mock --name researcher --role researcher
node ~/AgentMesh/dist/index.js connect mock --name reviewer --role reviewer

node ~/AgentMesh/dist/index.js chat "Hello AgentMesh"
node ~/AgentMesh/dist/index.js history
node ~/AgentMesh/dist/index.js plan "research and review this project"
node ~/AgentMesh/dist/index.js swarm "research and review this project" --agents researcher,reviewer
```

The mock provider is for local testing. It proves the AgentMesh workflow, context persistence, routing, collaboration, and synthesis pipeline, but it is not a real AI service.

## Use a real provider

AgentMesh currently supports provider adapters for:

```text
mock
openai
anthropic
gemini
```

Connect a provider to your project:

```bash
node ~/AgentMesh/dist/index.js connect openai --name chatgpt-agent
```

Or select a model explicitly:

```bash
node ~/AgentMesh/dist/index.js connect openai --name chatgpt-agent --model <model>
```

### OpenAI account login

The default OpenAI route uses the provider-owned Codex CLI session rather than asking AgentMesh to copy account credentials.

First sign in with the supported Codex CLI on your device:

```bash
codex login
codex login status
```

Then check AgentMesh:

```bash
node ~/AgentMesh/dist/index.js auth
```

You should see:

```text
✓ openai: account login ready
```

Now normal `chat` and `swarm` commands use account mode automatically for OpenAI.

On Termux/Android, a compatible Codex executable can be selected with:

```bash
export AGENTMESH_OPENAI_CLI="/absolute/path/to/codex"
```

### OpenAI API-key login

API mode is still supported through an environment variable:

```bash
export OPENAI_API_KEY="YOUR_KEY"
```

Use API mode explicitly:

```bash
node ~/AgentMesh/dist/index.js chat "Hello" --api
```

Never put API keys in `.agentmesh/project.json`, source files, Git commits, GitHub issues, or chat messages.

### Anthropic

Set the API key for API mode:

```bash
export ANTHROPIC_API_KEY="YOUR_KEY"
```

For account mode, use the official Claude CLI when available:

```bash
claude
```

Then run:

```bash
node ~/AgentMesh/dist/index.js auth
```

### Gemini

API-key mode:

```bash
export GEMINI_API_KEY="YOUR_KEY"
```

Gemini developer OAuth is supported separately through AgentMesh's developer OAuth flow. AgentMesh does **not** reuse Gemini CLI account credentials.

## Main commands

```text
init [name]                         Create a project
connect <provider>                  Add an AI agent
agents                              List connected agents
switch <agent>                      Switch active agent
providers                           List provider adapters
auth                                Check authentication readiness
login [provider]                    Start supported login flow
logout <provider>                   Log out/remove stored login
chat <message>                     Send a message
chat <message> --api                Force API-key mode
plan <task>                         Preview the role-based workflow
swarm <task>                        Run multiple agents sequentially
swarm <task> --agents a,b           Choose exact agents
swarm <task> --no-synthesize        Skip final synthesis
history                             Show persistent shared context
status                              Show project status
```

When using the source checkout, prefix commands with `node ~/AgentMesh/dist/index.js`.

## How the multi-agent flow works

1. Connect multiple agents, each with its own provider, model, name, and role.
2. Switch agents without replacing the shared project context.
3. `chat` reads the existing shared context and writes the new user/agent messages back to the project.
4. `plan` selects relevant specialist roles for a task.
5. `swarm` executes agents sequentially and passes bounded context from successful agents to later stages.
6. Final synthesis combines the successful contributions into one answer.

Example:

```bash
node ~/AgentMesh/dist/index.js connect openai --name architect --role architect
node ~/AgentMesh/dist/index.js connect mock --name reviewer --role reviewer
node ~/AgentMesh/dist/index.js swarm "Design and review the next CLI feature" --agents architect,reviewer
```

## Where data is stored

Project-specific context is stored under:

```text
my-project/.agentmesh/
```

AgentMesh-managed developer OAuth credentials are stored outside the project directory under:

```text
~/.agentmesh/credentials.json
```

Provider-owned account CLI credentials stay under the provider's own CLI/session management.

## Troubleshooting

### `No AgentMesh project found`

Run the command from inside an initialized project, or use the source checkout form:

```bash
cd ~/AgentMesh
node dist/index.js init my-project
cd my-project
```

### `Provider adapter not configured`

Rebuild the source checkout:

```bash
cd ~/AgentMesh
npm install
npm run check
npm test
npm run build
```

### OpenAI says account login is unavailable

Check the provider-owned CLI first:

```bash
codex login status
node ~/AgentMesh/dist/index.js auth
```

On Termux, make sure the selected Codex executable can actually run on Android/ARM64 and set `AGENTMESH_OPENAI_CLI` when needed.

### API request fails with billing/credit errors

That is a provider account/billing issue rather than AgentMesh authentication. ChatGPT subscriptions and OpenAI API billing are separate systems.

## Development and validation

From the repository root:

```bash
npm install
npm run check
npm test
npm run build
```

The current clean-room suite covers the CLI lifecycle, account-login bridge behavior, role routing, orchestration, synthesis, and authentication safety. Before a release, also exercise at least one real provider request on the target device.

## Security rules

Never commit or paste:

- API keys
- OAuth access or refresh tokens
- client secrets
- passwords
- browser cookies
- provider session files

AgentMesh is designed so the project owns shared context and orchestration while provider-specific credentials remain with environment variables or provider-owned login sessions.

## License

MIT
