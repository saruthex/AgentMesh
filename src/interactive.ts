import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { findProjectRoot, readProjectConfig } from './storage/project.js';
import { agentRoles, connectAgent, switchAgent } from './agents/registry.js';
import { loadContext } from './context/store.js';
import { providerRegistry } from './providers/registry.js';
import { supportedAuthProviders, providerAuthStatus } from './providers/auth.js';
import { accountLoginAvailability, accountLoginProviders, startAccountLogin } from './auth/account-login.js';
import { executeChat } from './providers/manager.js';
import { orchestrate } from './collaboration/orchestrator.js';
import { workflowSummary } from './collaboration/workflow.js';
import { synthesizeResults } from './collaboration/synthesis.js';
import type { ProviderMessage } from './providers/types.js';
import type { AgentRole } from './agents/types.js';

export const COMMANDS = ['help', 'status', 'agents', 'providers', 'auth', 'connect', 'switch', 'chat', 'plan', 'swarm', 'history', 'login', 'exit', 'quit'] as const;

export function parseInteractiveInput(input: string): string[] {
  const parts: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input.trim())) !== null) parts.push(match[1] ?? match[2] ?? match[3]);
  return parts.map(part => part.replace(/\\(["'])/g, '$1'));
}

function requireProject(): string {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run `agentmesh init` first.');
  return root;
}

function renderHeader(root: string): void {
  const config = readProjectConfig(root);
  console.log(chalk.cyan('\n╭──────────────────────────────────────────╮'));
  console.log(chalk.cyan('│') + chalk.bold('               AGENTMESH                  ') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.gray('        Multi-Agent Terminal Workspace    ') + chalk.cyan('│'));
  console.log(chalk.cyan('╰──────────────────────────────────────────╯'));
  console.log(`${chalk.gray('Project:')} ${chalk.bold(config.name)}`);
  console.log(`${chalk.gray('Agents:')} ${config.agents.length}  ${chalk.gray('Context:')} ${loadContext().length}`);
  console.log(chalk.gray('Type `help` for commands. Type `exit` to leave.\n'));
}

function printAgents(root: string): void {
  const config = readProjectConfig(root);
  if (!config.agents.length) return console.log(chalk.yellow('No agents connected yet. Use: connect <provider> [name] [role]'));
  for (const agent of config.agents) {
    const marker = config.activeAgent === agent.id ? chalk.green('●') : chalk.gray('○');
    console.log(`${marker} ${chalk.bold(agent.name)}  ${chalk.gray(agent.provider)}  ${chalk.gray(agent.role ?? 'general')}${agent.model ? `  ${chalk.gray(agent.model)}` : ''}${config.activeAgent === agent.id ? chalk.green('  active') : ''}`);
  }
}

function printProviders(): void {
  for (const provider of providerRegistry.list()) console.log(`• ${provider}`);
}

function printAuth(): void {
  for (const provider of supportedAuthProviders()) {
    const apiReady = providerAuthStatus(provider);
    const accountConfigured = accountLoginProviders().includes(provider);
    const accountReady = accountConfigured && accountLoginAvailability(provider);
    console.log(`${accountReady || apiReady ? chalk.green('✓') : chalk.yellow('○')} ${provider}: ${accountReady ? 'account login ready' : apiReady ? 'API key available' : 'API key missing'}`);
  }
}

function help(): void {
  console.log(chalk.bold('\nInteractive commands'));
  console.log('  agents                                  List connected agents');
  console.log('  connect <provider> [name] [role]        Connect an agent');
  console.log('  switch <agent>                          Change active agent');
  console.log('  chat                                    Start a chat with the active agent');
  console.log('  plan <task>                             Preview role-based workflow');
  console.log('  swarm <task>                            Run a multi-agent task with synthesis');
  console.log('  swarm --no-synthesize <task>            Run without final synthesis');
  console.log('  history                                 Show shared project context');
  console.log('  status                                  Show project status');
  console.log('  providers                               List available providers');
  console.log('  auth                                    Show authentication readiness');
  console.log('  login <provider>                        Start provider account login');
  console.log('  help                                    Show this help');
  console.log('  exit / quit                             Leave AgentMesh');
  console.log(chalk.gray('\nAll non-interactive commands remain available: agentmesh <command> ...\n'));
}

async function interactiveChat(): Promise<void> {
  const root = requireProject();
  const config = readProjectConfig(root);
  if (!config.activeAgent) throw new Error('No active agent. Connect one first.');
  const agent = config.agents.find(item => item.id === config.activeAgent);
  if (!agent) throw new Error('Active agent configuration is invalid.');

  console.log(chalk.gray(`Chatting with ${agent.name}. Type /exit to return to the main prompt.`));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string) => new Promise<string>(resolve => rl.question(question, resolve));
  try {
    while (true) {
      const message = (await ask(chalk.green('you> '))).trim();
      if (message === '/exit' || message === '/quit') break;
      if (!message) continue;
      const history: ProviderMessage[] = loadContext().map(item => ({ role: item.role === 'agent' ? 'assistant' : item.role, content: item.content }));
      try {
        const resolvedProvider = agent.provider === 'custom' ? 'mock' : agent.provider;
        const authMode = resolvedProvider === 'openai' || resolvedProvider === 'anthropic' ? 'account' : 'api';
        const response = await executeChat(resolvedProvider, history, { model: agent.model, authMode });
        console.log(`\n${chalk.cyan(agent.name)}> ${response.content}\n`);
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        console.log(chalk.red(`✗ ${text}`));
      }
    }
  } finally {
    rl.close();
  }
}

export async function runInteractiveCommand(input: string, root: string): Promise<boolean> {
  const parts = parseInteractiveInput(input);
  const [command, ...args] = parts;
  if (!command) return true;

  switch (command.toLowerCase()) {
    case 'help': help(); return true;
    case 'exit':
    case 'quit': return false;
    case 'status': {
      const config = readProjectConfig(root);
      console.log(`${chalk.bold(config.name)}\n${chalk.gray('Project:')} ${root}\n${chalk.gray('Agents:')} ${config.agents.length}\n${chalk.gray('Active:')} ${config.activeAgent ?? 'none'}\n${chalk.gray('Context messages:')} ${loadContext().length}`);
      return true;
    }
    case 'agents': printAgents(root); return true;
    case 'providers': printProviders(); return true;
    case 'auth': printAuth(); return true;
    case 'history': {
      const messages = loadContext();
      if (!messages.length) console.log('No shared context yet.');
      else for (const message of messages) console.log(`[${message.role}] ${message.agentId ?? 'system'}: ${message.content}`);
      return true;
    }
    case 'connect': {
      const provider = args[0];
      if (!provider) { console.log('Usage: connect <provider> [name] [role]'); return true; }
      const supported = [...providerRegistry.list(), 'custom'];
      if (!supported.includes(provider)) { console.log(chalk.red(`Unsupported provider. Use: ${supported.join(', ')}`)); return true; }
      const name = args[1];
      const role = (args[2] ?? 'general') as AgentRole;
      if (!agentRoles.includes(role)) { console.log(chalk.red(`Invalid role. Use: ${agentRoles.join(', ')}`)); return true; }
      const agent = connectAgent(provider, name, undefined, role);
      console.log(chalk.green(`✓ Connected ${agent.name} (${provider}, ${role})`));
      return true;
    }
    case 'switch': {
      if (!args[0]) { console.log('Usage: switch <agent>'); return true; }
      const active = switchAgent(args[0]);
      console.log(chalk.green(`✓ Active agent: ${active.name}`));
      return true;
    }
    case 'chat': await interactiveChat(); return true;
    case 'plan': {
      const task = args.join(' ').trim();
      if (!task) { console.log('Usage: plan <task>'); return true; }
      const config = readProjectConfig(root);
      console.log(chalk.bold('AgentMesh workflow plan'));
      for (const step of workflowSummary(task, config.agents)) console.log(`• ${step}`);
      return true;
    }
    case 'swarm': {
      const noSynthesize = args[0] === '--no-synthesize';
      const task = (noSynthesize ? args.slice(1) : args).join(' ').trim();
      if (!task) { console.log('Usage: swarm [--no-synthesize] <task>'); return true; }
      console.log(chalk.gray('Running swarm...'));
      const results = await orchestrate(task);
      for (const result of results) console.log(`\n${chalk.cyan(`[${result.agent.name}]`)}${result.success ? '' : chalk.red(' — failed')}\n${result.content}`);
      if (!noSynthesize && results.some(result => result.success)) {
        const finalAnswer = await synthesizeResults(task, results);
        if (finalAnswer) console.log(`\n${chalk.green('✓ Final synthesis')}\n${chalk.bold(finalAnswer)}`);
      }
      return true;
    }
    case 'login': {
      const provider = args[0];
      if (!provider || provider === 'gemini') {
        console.log(chalk.yellow('Use `login openai` or `login anthropic` for provider-owned account login. Gemini account login must be completed in Gemini CLI itself.'));
        return true;
      }
      await startAccountLogin(provider);
      console.log(chalk.green(`✓ ${provider} account login completed`));
      return true;
    }
    default:
      console.log(chalk.yellow(`Unknown command: ${command}. Type `) + chalk.bold('help') + chalk.yellow(' for available commands.'));
      return true;
  }
}

export async function startInteractiveMode(): Promise<void> {
  const root = requireProject();
  renderHeader(root);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let running = true;
  const onSigint = () => console.log(chalk.gray('\nUse `exit` to leave AgentMesh.'));
  rl.on('SIGINT', onSigint);
  try {
    while (running) {
      const line = await new Promise<string>(resolve => rl.question(chalk.green('agentmesh> '), resolve));
      try {
        running = await runInteractiveCommand(line, root);
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        console.log(chalk.red(`✗ ${text}`));
      }
    }
  } finally {
    rl.off('SIGINT', onSigint);
    rl.close();
  }
  console.log(chalk.gray('Goodbye 👋'));
}
