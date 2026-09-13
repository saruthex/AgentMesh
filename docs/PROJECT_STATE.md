# AgentMesh Project State

This file is the handoff record for starting AgentMesh from a completely clean machine/Termux environment.

## Current baseline

**Branch:** `integration-hardening`

The current branch contains the Phase 1–9 implementation, Phase 10 authentication infrastructure, Termux-compatible OpenAI account-CLI support, explicit account-authenticated collaboration, updated clean-start documentation, and initial automated regression tests.

Historical phase branches remain available for the earlier milestones.

## Implemented capabilities

### Core CLI

- initialize an AgentMesh project
- locate and load project configuration
- show project status
- persist project context/history
- connect multiple named agents
- switch the active agent without replacing shared project context

### Providers

- provider registry and adapter abstraction
- Mock provider for local development/testing
- OpenAI adapter
- Anthropic adapter
- Gemini adapter
- provider/model selection per agent
- API-key authentication through environment variables
- provider initialization and execution manager
- transient provider retry handling
- per-agent provider failures do not destroy an entire collaboration run

### Collaboration

- agent roles: `general`, `researcher`, `architect`, `developer`, `reviewer`, `tester`
- role-aware routing
- workflow planning with `plan`
- multi-agent sequential collaboration with `swarm`
- explicit agent selection with `--agents`
- bounded collaboration context
- persisted shared results
- optional final synthesis
- `--no-synthesize` for inspecting individual contributions
- swarm orchestration explicitly requests account authentication so account sessions cannot silently fall back to API-key auth
- final synthesis explicitly requests account authentication as well

### Authentication

- provider authentication readiness reporting
- login adapter abstraction and registry
- secure local credential storage for AgentMesh-managed developer OAuth credentials
- login/logout service flow
- Gemini developer OAuth adapter
- PKCE state/verifier handling
- local OAuth callback server on loopback
- Termux browser opening through `termux-open-url` when available
- OAuth token exchange
- refresh-token handling for Gemini
- stored login credentials reused by the Gemini provider
- provider-owned account CLI login/execution bridge for OpenAI and Anthropic where supported
- provider-owned OpenAI CLI logout delegation
- OpenAI account CLI executable override for Android/Termux compatibility

## Credential storage

AgentMesh-managed login credentials are stored outside the project directory under:

```text
~/.agentmesh/credentials.json
```

The implementation creates the directory with restrictive permissions and the credential file with restrictive permissions. API keys remain environment-based and are not written to project configuration.

Provider-owned account CLI credentials remain controlled by the provider CLI. AgentMesh does not copy or persist those credentials.

Never commit credentials, OAuth tokens, API keys, client secrets, or browser/session cookies.

## Login policy

Login support must use provider-documented authentication mechanisms. AgentMesh must not:

- collect provider passwords
- scrape browser cookies
- copy private ChatGPT sessions
- impersonate a first-party application
- store raw browser session state
- claim that a ChatGPT subscription grants OpenAI API credits

For OpenAI account authentication, AgentMesh delegates to a compatible `codex` CLI installation rather than attempting to reproduce or extract the ChatGPT session. On Android/Termux the executable can be selected with `AGENTMESH_OPENAI_CLI`.

For Anthropic account authentication, AgentMesh delegates to the provider CLI when the required CLI is available.

Gemini account authentication is intentionally not delegated through Gemini CLI credentials; AgentMesh keeps the Gemini developer OAuth path separate.

## Clean-start validation

From a fresh Termux environment:

```bash
git clone -b integration-hardening https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm test
npm run build
node dist/index.js --help
```

Expected result:

- dependency installation completes
- TypeScript check completes with no errors
- automated regression tests pass
- TypeScript build completes with no errors
- CLI help is displayed

Create a test project:

```bash
node dist/index.js init provider-test
cd provider-test
node ../dist/index.js status
```

If the repository is cloned into `~/AgentMesh`, the normal form is:

```bash
node ~/AgentMesh/dist/index.js init provider-test
cd ~/AgentMesh/provider-test
node ~/AgentMesh/dist/index.js status
```

## OpenAI account-authenticated Termux test

A compatible Codex CLI must already be installed and logged in by its own supported login flow. For a Termux/Android-compatible executable, AgentMesh can use:

```bash
export AGENTMESH_OPENAI_CLI="/absolute/path/to/codex"
```

Then verify provider-owned login status and AgentMesh readiness:

```bash
codex login status
cd ~/AgentMesh
node dist/index.js auth
```

Expected OpenAI readiness is `openai: account login ready` when the selected CLI reports a valid account session.

Create a fresh project and test real account execution:

```bash
node dist/index.js init openai-account-test
cd openai-account-test
node ../dist/index.js connect openai -n chatgpt-agent
node ../dist/index.js chat "Say hello and state which authentication path you are using."
```

Verify context persistence with a distinctive phrase, then request it again in a later command. `history` should contain both the user message and the provider response.

Verify logout delegation:

```bash
node ../dist/index.js logout openai
codex login status
```

The provider-owned CLI should report that the account is no longer logged in.

## Collaboration validation

Use explicit agent selection when testing multi-agent execution so role matching cannot unintentionally omit a connected agent:

```bash
node ../dist/index.js swarm "Recall the exact constraint from the shared context, propose a next step, and review the plan." --agents chatgpt-agent,reviewer
```

For a real provider test, the selected providers must have working authentication. A mock agent is useful for deterministic local checks but does not prove semantic cross-provider understanding.

## Gemini developer OAuth test

Configure a Google Cloud project according to Google's Gemini developer OAuth requirements, then set the configuration locally:

```bash
export GEMINI_OAUTH_CLIENT_ID="YOUR_CLIENT_ID"
export GEMINI_OAUTH_CLIENT_SECRET="YOUR_CLIENT_SECRET"
export GEMINI_PROJECT_ID="YOUR_PROJECT_ID"
```

Run:

```bash
cd ~/AgentMesh
node dist/index.js login gemini --developer-oauth
```

Use `--no-browser` when the authorization URL needs to be opened manually. After authorization, verify `node dist/index.js auth` and then make a real Gemini chat request from a project.

## OpenAI API note

OpenAI API authentication is supported through `OPENAI_API_KEY`. ChatGPT account/subscription authentication is separate from OpenAI API billing and does not itself provide API credits. A live OpenAI API request therefore requires a valid API credential with available API billing/credits.

## Automated tests

The repository now provides an initial regression suite using TypeScript plus the `tsx` test runner:

```bash
npm test
```

Current coverage locks the supported role list and the workflow planner's role-selection/fallback behavior. More subprocess and real-provider integration coverage is still required before calling the project production-ready.

## Validation rule for future phases

A phase is not considered complete merely because code has been committed. Completion requires:

1. source code is committed to the correct GitHub branch;
2. `npm run check` passes;
3. `npm test` passes;
4. `npm run build` passes;
5. the relevant CLI workflow is exercised from a clean user perspective;
6. provider/network behavior is tested when the phase depends on a real provider;
7. any remaining external prerequisite is clearly identified rather than hidden behind a manual code change.

## User-testing principle

The next major validation remains a clean-room Termux run. The user should delete the local AgentMesh checkout and related test project, clone the documented branch again, install dependencies, run the automated tests, build, and exercise the CLI as a normal user would.

If that clean-room run exposes a setup error, the repository/documentation/CLI should be fixed at the source and the clean-room test repeated. The user should not be asked to patch TypeScript, create missing source files, or repair generated output manually.
