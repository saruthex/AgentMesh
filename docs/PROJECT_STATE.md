# AgentMesh Project State

This file is the handoff record for starting AgentMesh from a completely clean machine/Termux environment.

## Current baseline

**Branch:** `phase-10-login-auth`

**Latest implementation commit before this documentation update:** `d66d5d3838f2740f14a45a33bbbe06518dfde903`

The branch currently contains the Phase 1–9 implementation plus Phase 10 login-auth infrastructure and Gemini OAuth support.

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

### Authentication

- provider authentication readiness reporting
- login adapter abstraction
- login adapter registry
- secure local credential storage
- login/logout service flow
- official Gemini OAuth adapter
- PKCE state/verifier handling
- local OAuth callback server on loopback
- Termux browser opening through `termux-open-url` when available
- OAuth token exchange
- refresh-token handling for Gemini
- stored login credentials reused by the Gemini provider

## Credential storage

AgentMesh stores login credentials outside the project directory under:

```text
~/.agentmesh/credentials.json
```

The implementation creates the directory with restrictive permissions and the credential file with restrictive permissions. API keys remain environment-based and are not written to project configuration.

Never commit credentials, OAuth tokens, API keys, client secrets, or browser/session cookies.

## Official login policy

Login support must use provider-documented authentication mechanisms. AgentMesh must not:

- collect provider passwords
- scrape browser cookies
- copy private ChatGPT sessions
- impersonate a first-party application
- store raw browser session state
- claim that a ChatGPT subscription grants OpenAI API credits

Gemini OAuth is the current official login integration. Other providers should only be added when their official third-party OAuth/device flow is documented and appropriate for a CLI application.

## Clean-start validation

A fresh environment should be able to perform the following without editing source code or manually repairing generated files:

```bash
git clone -b phase-10-login-auth https://github.com/saruthex/AgentMesh.git
cd AgentMesh
npm install
npm run check
npm run build
node dist/index.js --help
```

Expected result:

- dependency installation completes
- TypeScript check completes with no errors
- TypeScript build completes with no errors
- CLI help is displayed

Create a test project:

```bash
node dist/index.js init provider-test
cd provider-test
node ../AgentMesh/dist/index.js status
```

If the repository is cloned into `~/AgentMesh`, the normal form is:

```bash
node ~/AgentMesh/dist/index.js init provider-test
cd ~/provider-test
node ~/AgentMesh/dist/index.js status
```

## Gemini OAuth clean-start test

Before login, configure a Google Cloud project according to Google's Gemini API OAuth requirements:

1. Create/select a Google Cloud project.
2. Enable the Generative Language API.
3. Configure the OAuth consent screen and add the intended test user if the app is in testing mode.
4. Create a Desktop application OAuth client.
5. Keep the OAuth client secret private.
6. Configure AgentMesh in the local shell:

```bash
export GEMINI_OAUTH_CLIENT_ID="YOUR_CLIENT_ID"
export GEMINI_OAUTH_CLIENT_SECRET="YOUR_CLIENT_SECRET"
export GEMINI_PROJECT_ID="YOUR_PROJECT_ID"
```

Then:

```bash
cd ~/AgentMesh
node dist/index.js login gemini
```

If the browser cannot be opened automatically:

```bash
node dist/index.js login gemini --no-browser
```

After the browser authorization completes, verify:

```bash
node dist/index.js auth
```

Then configure a Gemini agent in an AgentMesh project and make a real chat request. The exact model should be supplied by the user's current Gemini configuration rather than hard-coded into the test documentation.

## OpenAI API note

OpenAI API authentication is supported through `OPENAI_API_KEY`. ChatGPT account/subscription authentication is a separate product flow from OpenAI API access and does not supply API credits. A live OpenAI request therefore requires a valid API credential with available API billing/credits.

## Validation rule for future phases

A phase is not considered complete merely because code has been committed. Completion requires:

1. source code is committed to the correct GitHub branch;
2. `npm run check` passes;
3. `npm run build` passes;
4. the relevant CLI workflow is exercised from a clean user perspective;
5. provider/network behavior is tested when the phase depends on a real provider;
6. any remaining external prerequisite is clearly identified rather than hidden behind a manual code change.

## User-testing principle

The next major test is intentionally a clean-room Termux test. The user should delete the local AgentMesh checkout and related test project, clone the documented branch again, install dependencies, build, and run the CLI as a normal user would.

If that clean-room run exposes a setup error, the repository/documentation/CLI should be fixed at the source and the clean-room test repeated. The user should not be asked to patch TypeScript, create missing source files, or repair generated output manually.
