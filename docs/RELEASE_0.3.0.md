# AgentMesh 0.3.0 Release

AgentMesh 0.3.0 is the first release candidate of the provider-agnostic multi-agent terminal workspace.

## Highlights

- `agentmesh` starts the interactive workspace directly when run inside an AgentMesh project.
- Normal text is treated as conversation with the active agent.
- Slash commands manage agents, providers, authentication, planning, swarm execution, history, and session state.
- Multiple agents share persistent project context and can be switched without losing context.
- Role-aware planning and sequential multi-agent swarm orchestration are supported.
- OpenAI and Anthropic account execution can use their provider-owned CLIs without copying provider credentials into AgentMesh.
- API-key execution remains available where configured.
- Gemini account OAuth is intentionally not piggybacked through AgentMesh.
- The CLI is designed to work in Node.js terminals, including Termux.

## Verified gates

The repository has been validated with TypeScript checking, automated tests, production build, interactive CLI tests, clean-room project lifecycle coverage, and a successful real OpenAI account-backed request using the provider-owned Codex CLI path.

## Install from source

```bash
git clone https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
npm install -g .
```

Then create and open a project:

```bash
agentmesh init my-project
cd my-project
agentmesh
```

## Security

Never commit or paste API keys, OAuth client secrets, provider CLI credentials, or other authentication secrets into the repository or chat. AgentMesh keeps provider account credentials owned by the provider CLI rather than copying them into project configuration.
