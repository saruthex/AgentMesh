#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initProject, findProjectRoot, readProjectConfig } from './storage/project.js';
import { connectAgent, switchAgent, agentRoles } from './agents/registry.js';
import type { AgentRole } from './agents/types.js';
import { addMessage, loadContext } from './context/store.js';
import { executeChat, initializeProviders } from './providers/manager.js';
import { providerRegistry } from './providers/registry.js';
import { providerAuthStatus, supportedAuthProviders } from './providers/auth.js';
import { beginLogin, completeLogin, listLoginProviders, logout } from './auth/service.js';
import { accountLoginAvailability, accountLoginProviders, startAccountLogin } from './auth/account-login.js';
import { accountCliLogout } from './providers/account-cli.js';
import type { ProviderMessage } from './providers/types.js';
import { orchestrate } from './collaboration/orchestrator.js';
import { workflowSummary } from './collaboration/workflow.js';
import { synthesizeResults } from './collaboration/synthesis.js';
import { loginRegistry } from './providers/login-registry.js';
import { startInteractiveMode } from './interactive.js';

initializeProviders();

const program = new Command();
program.name('agentmesh').description('Provider-agnostic multi-agent orchestration for the terminal').version('0.3.0');

program.command('init [name]').description('Create an AgentMesh project').action((name?: string) => {
  const root = initProject(name);
  console.log(chalk.green('✓ AgentMesh project created'));
  console.log(chalk.cyan(root));
  console.log(chalk.gray(`Next: cd "${root}" && agentmesh`));
});

program.command('interactive').alias('ui').description('Open the interactive AgentMesh terminal workspace').action(async () => startInteractiveMode());

program.command('connect <provider>').option('-n, --name <name>').option('-m, --model <model>').option('-r, --role <role>', `Agent role: ${agentRoles.join(', ')}`)
  .description('Register an AI provider agent with this project')
  .action((provider: string, options) => {
    const supported = [...providerRegistry.list(), 'custom'];
    if (!supported.includes(provider)) throw new Error(`Unsupported provider. Use: ${supported.join(', ')}`);
    const role = (options.role ?? 'general') as AgentRole;
    if (!agentRoles.includes(role)) throw new Error(`Invalid role: ${role}. Use: ${agentRoles.join(', ')}`);
    const agent = connectAgent(provider, options.name, options.model, role);
    console.log(chalk.green(`✓ Connected ${agent.name}`));
    console.log(`ID: ${agent.id}`);
  });

program.command('agents').description('List connected agents').action(() => {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const config = readProjectConfig(root);
  if (!config.agents.length) return console.log(chalk.yellow('No agents connected yet.'));
  for (const agent of config.agents) {
    const active = config.activeAgent === agent.id ? chalk.green(' ● active') : '';
    console.log(`• ${agent.name} [${agent.provider}] (${agent.role ?? 'general'})${agent.model ? ` - ${agent.model}` : ''}${active}`);
  }
});

program.command('switch <agent>').description('Switch the active agent').action((agent: string) => {
  const active = switchAgent(agent);
  console.log(chalk.green(`✓ Active agent: ${active.name}`));
});

program.command('providers').description('List available provider adapters').action(() => {
  for (const provider of providerRegistry.list()) console.log(`• ${provider}`);
});

program.command('auth').description('Show provider authentication readiness without exposing secrets').action(() => {
  for (const provider of supportedAuthProviders()) {
    const apiReady = providerAuthStatus(provider);
    const accountConfigured = accountLoginProviders().includes(provider);
    const accountReady = accountConfigured && accountLoginAvailability(provider);
    const loginReady = loginRegistry.get(provider);
    if (accountReady) console.log(`${chalk.green('✓')} ${provider}: account login ready`);
    else {
      console.log(`${apiReady ? chalk.green('✓') : chalk.yellow('○')} ${provider}: ${apiReady ? 'API key available' : 'API key missing'}${loginReady ? ` | developer login: ${loginReady.methods.join(', ')}` : ''}`);
      if (accountConfigured) console.log(chalk.gray(`  ${provider}: provider account CLI installed, but account login is not completed or runnable`));
    }
  }
  for (const provider of accountLoginProviders()) {
    if (!accountLoginAvailability(provider)) {
      const label = provider === 'openai' ? 'install a provider-compatible Codex CLI for your platform' : 'install the official CLI for account login';
      console.log(chalk.gray(`  ${provider}: ${label}`));
    }
  }
});

program.command('login [provider]')
  .option('--developer-oauth', 'Use the developer OAuth flow instead of account/CLI login')
  .option('--no-browser', 'Do not attempt to open the authorization URL automatically')
  .description('Sign in with a provider account; no API key or client ID is required for account CLI login')
  .action(async (provider: string | undefined, options) => {
    const accountProviders = accountLoginProviders();
    const target = provider;
    if (!options.developerOauth) {
      if (!target) {
        console.log(chalk.bold('Account sign-in'));
        for (const name of ['openai', 'anthropic', 'gemini']) {
          const configured = accountProviders.includes(name);
          const available = configured && accountLoginAvailability(name);
          console.log(`  ${available ? chalk.green('✓') : chalk.yellow('○')} ${name}: ${available ? 'account login ready' : configured ? 'provider CLI not authenticated or not runnable' : 'account login unavailable'}`);
        }
        console.log(chalk.gray('\nUsage: agentmesh login openai | anthropic | gemini'));
        console.log(chalk.gray('Gemini account login cannot be delegated through AgentMesh because Google prohibits third-party piggybacking on Gemini CLI OAuth.'));
        return;
      }
      if (target === 'gemini') throw new Error('Gemini account login must be performed in Gemini CLI itself. AgentMesh cannot reuse Gemini CLI OAuth credentials. Use `gemini` to sign in with Google, or use the Gemini API-key path in AgentMesh.');
      if (!accountProviders.includes(target)) throw new Error(`Unsupported account provider: ${target}`);
      await startAccountLogin(target);
      console.log(chalk.green(`✓ ${target} account login completed`));
      console.log(chalk.gray('AgentMesh does not copy or store the provider CLI credentials.'));
      return;
    }
    const loginProviders = listLoginProviders();
    const oauthTarget = target ?? loginProviders[0];
    if (!oauthTarget) throw new Error('No developer OAuth login adapters are installed.');
    const start = await beginLogin(oauthTarget, 'oauth');
    if (!start.authorizationUrl) throw new Error(`Login adapter for ${oauthTarget} did not return an authorization URL.`);
    console.log(chalk.cyan(`Open this URL to authenticate ${oauthTarget}:`));
    console.log(start.authorizationUrl);
    const adapter = loginRegistry.get(oauthTarget) as { openAuthorizationUrl?: (url: string) => Promise<boolean> } | undefined;
    if (options.browser !== false && adapter?.openAuthorizationUrl) {
      const opened = await adapter.openAuthorizationUrl(start.authorizationUrl);
      console.log(opened ? chalk.green('✓ Authorization URL opened') : chalk.yellow('○ Could not open browser automatically; use the URL above.'));
    }
    console.log(chalk.gray('Waiting for the provider OAuth callback...'));
    const result = await completeLogin(oauthTarget, {});
    console.log(chalk.green(`✓ Logged in to ${result.provider}${result.accountLabel ? ` as ${result.accountLabel}` : ''}`));
  });

program.command('logout <provider>').description('Log out of a provider account and remove any locally stored AgentMesh credential').action(async (provider: string) => {
  const accountProviders = accountLoginProviders();
  if (accountProviders.includes(provider) && accountLoginAvailability(provider)) {
    try {
      await accountCliLogout(provider);
      console.log(chalk.green(`✓ Logged out of ${provider} account`));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`✗ ${message}`));
      process.exitCode = 1;
      return;
    }
  }
  const removed = logout(provider);
  console.log(removed ? chalk.green(`✓ Removed stored AgentMesh login for ${provider}`) : chalk.yellow(`No stored AgentMesh login for ${provider}`));
});

program.command('chat <message>')
  .option('-p, --provider <provider>', 'Override the active agent provider')
  .option('--api', 'Force API-key authentication instead of an available provider account CLI')
  .description('Send a message through the active provider and persist shared context')
  .action(async (message: string, options) => {
    const root = findProjectRoot(process.cwd());
    if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
    const config = readProjectConfig(root);
    if (!config.activeAgent) throw new Error('No active agent. Run: agentmesh connect <provider>');
    const activeAgent = config.agents.find(agent => agent.id === config.activeAgent);
    if (!activeAgent) throw new Error('Active agent configuration is invalid.');
    const providerId = options.provider ?? activeAgent.provider;
    const resolvedProvider = providerId === 'custom' ? 'mock' : providerId;
    const authMode = options.api ? 'api' : resolvedProvider === 'openai' || resolvedProvider === 'anthropic' ? 'account' : 'api';
    addMessage({ role: 'user', content: message, agentId: activeAgent.id });
    const history: ProviderMessage[] = loadContext().map(item => ({ role: item.role === 'agent' ? 'assistant' : item.role, content: item.content }));
    const response = await executeChat(resolvedProvider, history, { model: activeAgent.model, authMode });
    addMessage({ role: 'agent', content: response.content, agentId: activeAgent.id });
    console.log(chalk.green('✓ Message processed'));
    console.log(chalk.bold(response.content));
  });

program.command('plan <task>').description('Show the role-based workflow AgentMesh would use for a task').action((task: string) => {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const config = readProjectConfig(root);
  const steps = workflowSummary(task, config.agents);
  console.log(chalk.bold('AgentMesh workflow plan'));
  console.log(chalk.gray(`Task: ${task}`));
  for (const step of steps) console.log(`• ${step}`);
});

program.command('swarm <task>')
  .option('-a, --agents <agents>', 'Comma-separated agent names or IDs')
  .option('--api', 'Force API-key authentication for OpenAI/Anthropic swarm agents; provider-local adapters remain adapter-authenticated')
  .option('--no-synthesize', 'Skip the final combined answer')
  .description('Run a task through multiple agents sequentially using shared context')
  .action(async (task: string, options) => {
    const selectors = options.agents ? String(options.agents).split(',').map((value: string) => value.trim()).filter(Boolean) : undefined;
    const results = await orchestrate(task, selectors, options.api ? 'api' : 'account');
    const succeeded = results.filter(result => result.success);
    console.log(chalk.green(`✓ Orchestration completed with ${results.length} agent(s); ${succeeded.length} succeeded`));
    for (const result of results) {
      console.log(chalk.cyan(`\n[${result.agent.name}]${result.success ? '' : ' — failed'}`));
      console.log(result.content);
    }
    if (options.synthesize) {
      if (!succeeded.length) {
        console.log(chalk.yellow('\n○ Final synthesis skipped: no agent completed successfully.'));
        return;
      }
      const finalAnswer = await synthesizeResults(task, results, options.api ? 'api' : 'account');
      if (finalAnswer) {
        console.log(chalk.green('\n✓ Final synthesis'));
        console.log(chalk.bold(finalAnswer));
      }
    }
  });

program.command('history').description('Show shared project context').action(() => {
  const messages = loadContext();
  if (!messages.length) return console.log('No shared context yet.');
  for (const message of messages) console.log(`[${message.role}] ${message.agentId ?? 'system'}: ${message.content}`);
});

program.command('status').description('Show project status').action(() => {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const config = readProjectConfig(root);
  console.log(chalk.bold(config.name));
  console.log('Project:', root);
  console.log('Agents:', config.agents.length);
  console.log('Active:', config.activeAgent ?? 'none');
  console.log('Context messages:', loadContext().length);
});

if (process.argv.length <= 2) {
  startInteractiveMode().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ ${message}`));
    process.exitCode = 1;
  });
} else {
  program.parseAsync().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ ${message}`));
    process.exitCode = 1;
  });
}
