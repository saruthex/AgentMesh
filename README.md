# AgentMesh

**AgentMesh is a provider-agnostic multi-agent orchestration CLI.**

Connect multiple AI providers, keep project context independent from any single model, switch agents without losing context, and run teams of agents through shared workflows.

## Status

🚧 Active development — multi-agent orchestration foundation.

## Commands

```bash
agentmesh init [name]
agentmesh connect <provider> --name <name> --model <model> --role <role>
agentmesh agents
agentmesh switch <agent>
agentmesh providers
agentmesh auth
agentmesh chat <message>
agentmesh swarm <task>
agentmesh swarm <task> --agents agent-a,agent-b
agentmesh history
agentmesh status
```

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

Each stage receives the shared project context plus previous agent output. Responses are persisted into AgentMesh shared memory for later agents and future commands.

## Provider authentication

AgentMesh reads provider credentials from environment variables and does not save API keys in project files:

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GEMINI_API_KEY="..."
agentmesh auth
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

The project context belongs to AgentMesh rather than a specific provider.

## Development

```bash
npm install
npm run check
npm run build
npm run dev -- --help
```
