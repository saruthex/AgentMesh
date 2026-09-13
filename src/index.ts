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
import type { ProviderMessage } from './providers/types.js';
import { orchestrate } from './collaboration/orchestrator.js';
import { workflowSummary } from './collaboration/workflow.js';
import { synthesizeResults } from './collaboration/synthesis.js';
import { loginRegistry } from './providers/login-registry.js';

initializeProviders();

const program = new Command();
program.name('agentmesh').description('Provider-agnostic multi-agent orchestration for the terminal').version('0.3.0');

program.command('init [name]').description('Create an AgentMesh project').action((name?: string) => {
  const root = initProject(name);
  console.log(chalk.green('✓ AgentMesh project created'));
  console.log(chalk.cyan(root));
  console.log(chalk.gray(`Next: cd "${root}" && agentmesh status`));
});

program.command('connect <provider>').option('-n, --name <name>').option('-m, --model <model>').option('-r, --role <role>', `Agent role: ${agentRoles.join(', ')}`)
  .description('Register an AI provider agent with this project')
  .action((provider: string, options) => {
    const supported = [...providerRegistry.list(), 'custom'];
    if (!supported.includes(provider)) {
      throw new Error(`Unsupported provider. Use: ${supported.join(', ')}`);
    }
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
    const loginReady = loginRegistry.get(provider);
    console.log(`${apiReady ? chalk.green('✓') : chalk.yellow('○')} ${provider}: ${apiReady ? 'API key available' : 'API key missing'}${loginReady ? ` | login: ${loginReady.methods.join(', ')}` : ''}`);
  }
  for (const provider of listLoginProviders()) {
    console.log(chalk.cyan(`  ${provider}: ${loginStatusLine(provider)}`));
  }
});

function loginStatusLine(provider: string): string {
  const statuses = listLoginProviders();
  return statuses.includes(provider) ? 'login adapter available' : 'login adapter unavailable';
}

program.command('login [provider]')
  .option('--method <method>', 'Authentication method (oauth or device)', 'oauth')
  .option('--no-browser', 'Do not attempt to open the authorization URL automatically')
  .description('Authenticate a provider using its official OAuth/device flow')
  .action(async (provider: string | undefined, options) => {
    const target = provider ?? listLoginProviders()[0];
    if (!target) throw new Error('No provider login adapters are installed.');

    try {
      const start = await beginLogin(target, options.method);
      if (!start.authorizationUrl) throw new Error(`Login adapter for ${target} did not return an authorization URL.`);

      console.log(chalk.cyan(`Open this URL to authenticate ${target}:`));
      console.log(start.authorizationUrl);

      const adapter = loginRegistry.get(target) as { openAuthorizationUrl?: (url: string) => Promise<boolean> } | undefined;
      if (options.browser !== false && adapter?.openAuthorizationUrl) {
        const opened = await adapter.openAuthorizationUrl(start.authorizationUrl);
        console.log(opened ? chalk.green('✓ Authorization URL opened') : chalk.yellow('○ Could not open browser automatically; use the URL above.'));
      }

      console.log(chalk.gray('Waiting for the provider OAuth callback...'));
      const result = await completeLogin(target, {});
      console.log(chalk.green(`✓ Logged in to ${result.provider}${result.accountLabel ? ` as ${result.accountLabel}` : ''}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (target === 'gemini' && message.includes('GEMINI_OAUTH_CLIENT_ID')) {
        console.error(chalk.yellow('Gemini login needs a Google OAuth Desktop client before the first login.'));
        console.error('Set these environment variables, then run `agentmesh login gemini` again:');
        console.error('  GEMINI_OAUTH_CLIENT_ID=<your Google OAuth client ID>');
        console.error('  GEMINI_OAUTH_CLIENT_SECRET=<your client secret, if required>');
        console.error('  GEMINI_PROJECT_ID=<your Google Cloud project ID>');
        console.error(chalk.gray('AgentMesh does not collect or store these values in the project.'));
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  });

program.command('logout <provider>').description('Remove the locally stored login credential for a provider').action((provider: string) => {
  const removed = logout(provider);
  console.log(removed ? chalk.green(`✓ Logged out of ${provider}`) : chalk.yellow(`No stored login for ${provider}`));
});

program.command('chat <message>')
  .option('-p, --provider <provider>', 'Override the active agent provider')
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

    addMessage({ role: 'user', content: message, agentId: activeAgent.id });
    const history: ProviderMessage[] = loadContext().map(item => ({
      role: item.role === 'agent' ? 'assistant' : item.role,
      content: item.content
    }));

    const response = await executeChat(resolvedProvider, history, { model: activeAgent.model });
    addMessage({ role: 'agent', content: response.content, agentId: activeAgent.id });

    console.log(chalk.green('✓ Message processed'));
    console.log(chalk.bold(response.content));
  });

program.command('plan <task>')
  .description('Show the role-based workflow AgentMesh would use for a task')
  .action((task: string) => {
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
  .option('--no-synthesize', 'Skip the final combined answer')
  .description('Run a task through multiple agents sequentially using shared context')
  .action(async (task: string, options) => {
    const selectors = options.agents
      ? String(options.agents).split(',').map((value: string) => value.trim()).filter(Boolean)
      : undefined;

    const results = await orchestrate(task, selectors);
    console.log(chalk.green(`✓ Orchestration completed with ${results.length} agent(s)`));
    for (const result of results) {
      console.log(chalk.cyan(`\n[${result.agent.name}]`));
      console.log(result.content);
    }

    if (options.synthesize) {
      const finalAnswer = await synthesizeResults(task, results);
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

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`✗ ${message}`));
  process.exitCode = 1;
});
