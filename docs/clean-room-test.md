# Clean-room Termux validation

This procedure validates AgentMesh from a fresh checkout without source edits or generated-file repairs.

## 1. Fresh checkout

```bash
rm -rf ~/AgentMesh

git clone -b cleanroom-hardening https://github.com/saruthex/AgentMesh.git ~/AgentMesh
cd ~/AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

## 2. Fresh project

```bash
node dist/index.js init cleanroom-test
cd ~/AgentMesh/cleanroom-test
node ../dist/index.js status
node ../dist/index.js providers
node ../dist/index.js agents
```

## 3. Connect and persist context

```bash
node ../dist/index.js connect mock -n reviewer -r reviewer
node ../dist/index.js connect mock -n architect -r architect
node ../dist/index.js agents
node ../dist/index.js chat "Remember this exact phrase: AgentMesh CLEANROOM 4182."
node ../dist/index.js history
node ../dist/index.js switch reviewer
node ../dist/index.js status
```

## 4. Deterministic collaboration

```bash
node ../dist/index.js swarm "Use the shared context to verify the exact phrase and propose the next step." --agents architect,reviewer
node ../dist/index.js history
```

## 5. Real OpenAI account path

The provider-owned CLI must be installed and logged in separately. On Termux/Android, select a compatible executable with `AGENTMESH_OPENAI_CLI` when needed.

```bash
codex login status
node ../dist/index.js auth
node ../dist/index.js connect openai -n chatgpt-agent
node ../dist/index.js chat "Repeat the exact clean-room phrase from shared context."
node ../dist/index.js swarm "Verify the exact phrase from shared context and give one next step." --agents chatgpt-agent,reviewer
```

## 6. API mode

API mode must remain explicit and must not expose secrets in the project.

```bash
OPENAI_API_KEY=... node ../dist/index.js chat "Say hello." --api
```

Never commit API keys, OAuth tokens, client secrets, or provider CLI credentials.

## 7. Logout

For an OpenAI account session delegated through the provider CLI:

```bash
node ../dist/index.js logout openai
codex login status
```

The provider-owned CLI remains responsible for its own credential lifecycle.

## Success criteria

A clean-room validation is successful when dependency installation, TypeScript checking, automated tests, and build all pass; CLI initialization and persistence work without source edits; deterministic mock collaboration works; and real provider execution succeeds when valid provider-owned authentication and billing are available.
