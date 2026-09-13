import { createInterface, type Interface } from 'node:readline';
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

export const COMMANDS = ['help', 'status', 'agents', 'providers', 'auth', 'connect', 'switch', 'chat', 'plan', 'swarm', 'history', 'login', 'logout', 'clear', 'exit', 'quit'] as const;
const SLASH_COMMANDS = COMMANDS.filter(command => command !== 'chat');

type Spinner = { stop(): void };

export function parseInteractiveInput(input: string): string[] {
  const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  return parts.map(value => value.replace(/^"|"$/g, ''));
}

function requireProject(): string {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run `agentmesh init` first.');
  return root;
}

function currentAgent(root: string) {
  const config = readProjectConfig(root);
  return config.agents.find(agent => agent.id === config.activeAgent);
}

function providerLabel(provider: string): string {
  return provider === 'mock' ? 'mock' : provider;
}

function renderHeader(root: string): void {
  const config = readProjectConfig(root);
  const active = config.agents.find(agent => agent.id === config.activeAgent);
  console.log(chalk.cyan('\n╭──────────────────────────────────────────────────────╮'));
  console.log(chalk.cyan('│') + chalk.bold('                    AGENTMESH                         ') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.gray('          Multi-Agent Terminal Workspace              ') + chalk.cyan('│'));
  console.log(chalk.cyan('╰──────────────────────────────────────────────────────╯'));
  console.log(`${chalk.gray('Project:')} ${chalk.bold(config.name)}    ${chalk.gray('Agents:')} ${config.agents.length}    ${chalk.gray('Context:')} ${loadContext().length}`);
  if (active) {
    const marker = active.provider === 'mock' ? chalk.yellow('⚠') : chalk.green('●');
    console.log(`${marker} ${chalk.gray('Active:')} ${chalk.bold(active.name)} ${chalk.gray(`(${providerLabel(active.provider)}${active.role ? ` • ${active.role}` : ''})`)}`);
    if (active.provider === 'mock') {
      console.log(chalk.yellow('  Mock provider is for testing; it echoes prompts and does not generate AI answers.'));
      console.log(chalk.gray('  Connect/switch to a real provider with: /connect openai <name> <role> or /switch <agent>'));
    }
  } else {
    console.log(chalk.yellow('No active agent. Connect a provider with /connect <provider> [name] [role].'));
  }
  console.log(chalk.gray('Type naturally to chat. Start with / for workspace commands.\n'));
}

function printAgents(root: string): void {
  const config = readProjectConfig(root);
  if (!config.agents.length) {
    console.log(chalk.yellow('No agents connected yet. Use /connect <provider> [name] [role].'));
    return;
  }
  for (const agent of config.agents) {
    const active = config.activeAgent === agent.id;
    const marker = active ? chalk.green('●') : chalk.gray('○');
    const provider = agent.provider === 'mock' ? chalk.yellow(agent.provider) : chalk.cyan(agent.provider);
    console.log(`${marker} ${chalk.bold(agent.name)}  ${provider}  ${chalk.gray(agent.role ?? 'general')}${agent.model ? `  ${chalk.gray(agent.model)}` : ''}${active ? chalk.green('  active') : ''}`);
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
    console.log(`${accountReady ? chalk.green('✓') : apiReady ? chalk.green('✓') : chalk.yellow('○')} ${provider}: ${accountReady ? 'account login ready' : apiReady ? 'API key available' : 'API key missing'}`);
  }
}

function showHelp(): void {
  console.log(chalk.bold('\nInteractive commands'));
  console.log('  /agents                                  List connected agents');
  console.log('  /connect <provider> [name] [role]        Connect an agent');
  console.log('  /switch <agent>                          Change active agent');
  console.log('  /plan <task>                             Preview role-based workflow');
  console.log('  /swarm <task>                            Run a multi-agent task with synthesis');
  console.log('  /swarm --no-synthesize <task>            Run without final synthesis');
  console.log('  /history                                 Show shared project context');
  console.log('  /status                                  Show project status');
  console.log('  /providers                               List available providers');
  console.log('  /auth                                    Show authentication readiness');
  console.log('  /login <provider>                        Start provider account login');
  console.log('  /logout <provider>                       Log out of a provider account');
  console.log('  /clear                                   Clear the current terminal screen');
  console.log('  /help                                    Show this help');
  console.log('  /exit /quit                              Leave AgentMesh');
  console.log(chalk.gray('\nNormal text is always conversation. Use /<command> only for workspace actions.'));
}

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function startSpinner(label = 'Thinking'): Spinner {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let index = 0;
  let active = true;
  const timer = setInterval(() => {
    if (!active) return;
    process.stdout.write(`\r${chalk.gray(`${frames[index++ % frames.length]} ${label}…`)}`);
  }, 80);
  return {
    stop() {
      active = false;
      clearInterval(timer);
      process.stdout.write('\r\x1b[K');
    },
  };
}

function completionList(prefix: string): string[] {
  const query = prefix.trim().toLowerCase();
  if (!query.startsWith('/')) return [];
  const body = query.slice(1);
  return SLASH_COMMANDS.filter(command => command.startsWith(body)).map(command => `/${command}`);
}

function installReadlineCompletion(rl: Interface): void {
  const completer = (line: string) => {
    const suggestions = completionList(line);
    return [suggestions, line];
  };
  // Node readline's completer signature is stable across supported Node LTS versions.
  (rl as Interface & { completer?: unknown }).completer = completer;
}

async function chatOnce(message: string): Promise<void> {
  const root = requireProject();
  const agent = currentAgent(root);
  if (!agent) {
    console.log(chalk.yellow('No active agent. Use /connect <provider> and then /switch <agent>.'));
    return;
  }
  const current = loadContext();
  const history: ProviderMessage[] = [...current.map(item => ({ role: item.role === 'agent' ? 'assistant' : item.role, content: item.content }) as ProviderMessage), { role: 'user', content: message }];
  const resolvedProvider = agent.provider === 'custom' ? 'mock' : agent.provider;
  const authMode = resolvedProvider === 'openai' || resolvedProvider === 'anthropic' ? 'account' : 'api';
  process.stdout.write(chalk.gray(`${agent.name} is thinking`));
  const spinner = startSpinner('Thinking');
  const started = Date.now();
  try {
    const response = await executeChat(resolvedProvider, history, { model: agent.model, authMode });
    spinner.stop();
    addMessageFromChat(agent.id, message, response.content);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n${chalk.cyan(agent.name)} ${chalk.gray(`(${resolvedProvider} • ${elapsed}s)`)}> ${response.content}\n`);
  } catch (error) {
    spinner.stop();
    const text = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`✗ ${text}`));
    if (resolvedProvider === 'mock') {
      console.log(chalk.gray('Mock responses are intentionally echoes. Connect a real provider to receive model output.'));
    }
  }
}

function addMessageFromChat(agentId: string, userMessage: string, response: string): void {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found.');
  // Persist only after successful provider completion so failed turns do not pollute context.
  const { addMessage } = requireContextStore();
  addMessage({ role: 'user', content: userMessage, agentId });
  addMessage({ role: 'agent', content: response, agentId });
}

function requireContextStore() {
  // Kept as a small indirection so chat execution/tests can be isolated without changing the public store API.
  return { addMessage: ((): ((message: { role: 'user' | 'agent'; content: string; agentId?: string }) => void) => {
    // eslint-free local dynamic import is not needed; this branch is replaced by direct import at build-time through closure.
    return message => {
      const mod = contextAddMessage;
      mod(message);
    };
  })() };
}

// The context store is synchronous; aliasing the imported function keeps this module easy to test.
import { addMessage as contextAddMessage } from './context/store.js';

function normalizeCommand(command: string): string {
  return command.startsWith('/') ? command.slice(1).toLowerCase() : command.toLowerCase();
}

async function runCommand(input: string, root: string): Promise<boolean> {
  const [rawCommand, ...args] = parseInteractiveInput(input);
  if (!rawCommand) return true;
  const command = normalizeCommand(rawCommand);

  if (!rawCommand.startsWith('/')) {
    await chatOnce(input.trim());
    return true;
  }

  switch (command) {
    case 'help': showHelp(); return true;
    case 'exit':
    case 'quit': return false;
    case 'clear': clearScreen(); renderHeader(root); return true;
    case 'status': {
      const config = readProjectConfig(root);
      const active = config.agents.find(agent => agent.id === config.activeAgent);
      console.log(`${chalk.bold(config.name)}\n${chalk.gray('Project:')} ${root}\n${chalk.gray('Agents:')} ${config.agents.length}\n${chalk.gray('Active:')} ${active ? `${active.name} (${active.provider})` : 'none'}\n${chalk.gray('Context messages:')} ${loadContext().length}`);
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
      const provider = args[0]?.toLowerCase();
      if (!provider) { console.log('Usage: /connect <provider> [name] [role]'); return true; }
      const supported = [...providerRegistry.list(), 'custom'];
      if (!supported.includes(provider)) { console.log(chalk.red(`Unsupported provider. Use: ${supported.join(', ')}`)); return true; }
      const name = args[1];
      const role = (args[2] ?? 'general') as typeof agentRoles[number];
      if (!agentRoles.includes(role)) { console.log(chalk.red(`Invalid role. Use: ${agentRoles.join(', ')}`)); return true; }
      const agent = connectAgent(provider, name, undefined, role);
      console.log(chalk.green(`✓ Connected ${agent.name} (${provider}, ${role})`));
      return true;
    }
    case 'switch': {
      if (!args[0]) { console.log('Usage: /switch <agent>'); return true; }
      const active = switchAgent(args[0]);
      console.log(chalk.green(`✓ Active agent: ${active.name} (${active.provider})`));
      return true;
    }
    case 'plan': {
      const task = args.join(' ').trim();
      if (!task) { console.log('Usage: /plan <task>'); return true; }
      const config = readProjectConfig(root);
      console.log(chalk.bold('AgentMesh workflow plan'));
      for (const step of workflowSummary(task, config.agents)) console.log(`• ${step}`);
      return true;
    }
    case 'swarm': {
      const noSynthesize = args[0] === '--no-synthesize';
      const task = (noSynthesize ? args.slice(1) : args).join(' ').trim();
      if (!task) { console.log('Usage: /swarm [--no-synthesize] <task>'); return true; }
      console.log(chalk.gray('Running swarm…'));
      const spinner = startSpinner('Working');
      try {
        const results = await orchestrate(task);
        spinner.stop();
        for (const result of results) console.log(`\n${chalk.cyan(`[${result.agent.name}]`)}${result.success ? '' : chalk.red(' — failed')}\n${result.content}`);
        if (!noSynthesize && results.some(result => result.success)) {
          const synthesisSpinner = startSpinner('Synthesizing');
          try {
            const finalAnswer = await synthesizeResults(task, results);
            synthesisSpinner.stop();
            if (finalAnswer) console.log(`\n${chalk.green('✓ Final synthesis')}\n${chalk.bold(finalAnswer)}`);
          } catch (error) {
            synthesisSpinner.stop();
            throw error;
          }
        }
      } catch (error) {
        spinner.stop();
        throw error;
      }
      return true;
    }
    case 'login': {
      const provider = args[0]?.toLowerCase();
      if (!provider || provider === 'gemini') { console.log(chalk.yellow('Use /login openai or /login anthropic for provider-owned account login. Gemini account login must be completed in Gemini CLI itself.')); return true; }
      await startAccountLogin(provider);
      console.log(chalk.green(`✓ ${provider} account login completed`));
      return true;
    }
    case 'logout': {
      console.log(chalk.yellow('Use `agentmesh logout <provider>` from the terminal for provider logout.'));
      return true;
    }
    case 'chat': {
      console.log(chalk.gray('Normal text is already chat. Just type your message at the main prompt.'));
      return true;
    }
    default:
      console.log(chalk.yellow(`Unknown workspace command: ${rawCommand}. Type /help.`));
      return true;
  }
}

export async function startInteractiveMode(): Promise<void> {
  const root = requireProject();
  clearScreen();
  renderHeader(root);
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: chalk.green('You › ') });
  installReadlineCompletion(rl);
  let running = true;
  rl.on('SIGINT', () => {
    console.log(chalk.gray('\nUse /exit to quit AgentMesh.'));
    rl.prompt();
  });
  while (running) {
    const line = await new Promise<string>(resolve => rl.question(chalk.green('You › '), resolve));
    try {
      running = await runCommand(line.trim(), root);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`✗ ${text}`));
    }
  }
  rl.close();
  console.log(chalk.gray('Goodbye 👋'));
}
