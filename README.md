# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and prepare teams of agents to collaborate on the same project.

## Status

🚧 Active development — foundation release.

## Commands

```bash
agentmesh init [name]
agentmesh agents
agentmesh status
```

## Architecture

```text
CLI → AgentMesh Core → Shared Project Context
                         ├── Agent A
                         ├── Agent B
                         └── Agent C
```

The project context belongs to AgentMesh rather than a specific provider.

## Development

```bash
npm install
npm run dev -- --help
npm run build
```
