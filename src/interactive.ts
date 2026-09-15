import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { findProjectRoot, readProjectConfig } from './storage/project.js';
import { agentRoles, connectAgent, switchAgent } from './agents/registry.js';
import { addMessage, loadContext } from './context/store.js';
import { providerRegistry } from './providers/registry.js';
import { supportedAuthProviders, providerAuthStatus } from './providers/auth.js';
import { accountLoginAvailability, accountLoginProviders, startAccountLogin } from './auth/account-login.js';
import { executeChat } from './providers/manager.js';
import { orchestrate } from './collaboration/orchestrator.js';
import { workflowSummary } from './collaboration/workflow.js';
import { synthesizeResults } from './collaboration/synthesis.js';
import { runWithActivity } from './workspace/ui.js';
import { githubStatus, githubLogin, githubLogout, githubRepos, githubClone, githubPrCommand, githubIssueCommand } from './commands/github.js';
import { getGitHubAuthStatus } from './github/auth.js';
import { getGitStatus, getGitDiff, gitCommit } from './git/client.js';
import { listTasks, getTask, delegateTask } from './tasks/manager.js';
import { getAgentPermissions, getPermissionMode, setPermissionMode } from './permissions/manager.js';
import { messageBus } from './collaboration/messageBus.js';
import { getWorkspacePolicy, listWorkspace } from './workspace/files.js';
import type { ProviderMessage } from './providers/types.js';
import type { AgentRole } from './agents/types.js';

export const SLASH_COMMANDS = [
  'help', 'status', 'agents', 'providers', 'auth', 'connect', 'switch',
  'plan', 'swarm', 'history', 'login', 'logout', 'exit', 'quit',
  'github', 'git', 'tasks', 'task', 'permissions', 'workspace',
  'message', 'delegate', 'agent', 'activity'
] as const;

export const COMMANDS = [...SLASH_COMMANDS, 'chat'] as const;

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

async function renderHeader(root: string): Promise<void> {
  const config = readProjectConfig(root);
  console.log(chalk.cyan('\n╭──────────────────────────────────────────╮'));
  console.log(chalk.cyan('│') + chalk.bold('               AGENTMESH                  ') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.gray('          AI Multi-Agent Terminal         ') + chalk.cyan('│'));
  console.log(chalk.cyan('╰──────────────────────────────────────────╯'));
  console.log(`${chalk.gray('Project:')} ${chalk.bold(config.name)}`);

  const git = getGitStatus(root);
  const gitLabel = git.isRepo ? `${git.branch} (${git.clean ? 'clean' : `${git.modified.length + git.untracked.length} changes`})` : 'none';

  let ghLabel = '○ not connected';
  try {
    const gh = await getGitHubAuthStatus();
    if (gh.authenticated) ghLabel = `✓ ${gh.username}`;
  } catch {}

  console.log(`${chalk.gray('Agents:')} ${config.agents.length}  ${chalk.gray('Context:')} ${loadContext().length}  ${chalk.gray('Git:')} ${gitLabel}  ${chalk.gray('GitHub:')} ${ghLabel}`);
  console.log(chalk.gray('Talk normally. Use /help for workspace commands.\n'));
}

function printAgents(root: string): void {
  const config = readProjectConfig(root);
  if (!config.agents.length) return console.log(chalk.yellow('No agents connected yet. Use /connect <provider> [name] [role]'));
  for (const agent of config.agents) {
    const marker = config.activeAgent === agent.id ? chalk.green('●') : chalk.gray('○');
    const perms = getAgentPermissions(agent.id, agent.role).join(',');
    console.log(`${marker} ${chalk.bold(agent.name)}  ${chalk.gray(agent.provider)}  ${chalk.gray(agent.role ?? 'general')}${agent.model ? `  ${chalk.gray(agent.model)}` : ''}  ${chalk.gray(`[${perms}]`)}${config.activeAgent === agent.id ? chalk.green('  active') : ''}`);
  }
}

function printProviders(): void { for (const provider of providerRegistry.list()) console.log(`• ${provider}`); }

function printAuth(): void {
  for (const provider of supportedAuthProviders()) {
    const apiReady = providerAuthStatus(provider);
    const accountConfigured = accountLoginProviders().includes(provider);
    const accountReady = accountConfigured && accountLoginAvailability(provider);
    console.log(`${accountReady || apiReady ? chalk.green('✓') : chalk.yellow('○')} ${provider}: ${accountReady ? 'account login ready' : apiReady ? 'API key available' : 'API key missing'}`);
  }
}

function help(): void {
  console.log(chalk.bold('\nAgentMesh'));
  console.log('  Type any normal text to chat with the active agent.');
  console.log(chalk.bold('\nWorkspace commands'));
  console.log('  /agents                                 List connected agents and permissions');
  console.log('  /connect <provider> [name] [role]       Connect an agent');
  console.log('  /switch <agent>                         Change active agent');
  console.log('  /plan <task>                            Preview role-based workflow');
  console.log('  /swarm <task>                           Run a multi-agent task with synthesis');
  console.log('  /swarm --no-synthesize <task>           Run without final synthesis');
  console.log('  /tasks                                  List project tasks');
  console.log('  /task <id>                              View task details');
  console.log('  /message <agent> <msg>                  Send direct agent message');
  console.log('  /delegate <agent> <task>                Delegate task to agent');
  console.log('  /permissions                            View or configure capability permissions');
  console.log('  /workspace                              Show workspace files and status');
  console.log('  /git status | diff | commit             Git workspace controls');
  console.log('  /github status | login | repos | pr     GitHub integration controls');
  console.log('  /history                                Show shared project context');
  console.log('  /status                                 Show project status');
  console.log('  /providers                              List available providers');
  console.log('  /auth                                   Show authentication readiness');
  console.log('  /login <provider>                       Start provider account login');
  console.log('  /logout <provider>                      Log out of a provider account');
  console.log('  /help                                   Show this help');
  console.log('  /exit                                   Leave AgentMesh');
  console.log(chalk.gray('\nThe classic `agentmesh <command> ...` CLI remains available outside this workspace.\n'));
}

async function chatOnce(message: string): Promise<void> {
  const root = requireProject();
  const config = readProjectConfig(root);
  if (!config.activeAgent) {
    console.log(chalk.yellow('No active agent yet. Use /connect <provider> and then /switch <agent> if needed.'));
    return;
  }
  const agent = config.agents.find(item => item.id === config.activeAgent);
  if (!agent) throw new Error('Active agent configuration is invalid.');
  const resolvedProvider = agent.provider === 'custom' ? 'mock' : agent.provider;
  const history: ProviderMessage[] = loadContext().map(item => ({ role: item.role === 'agent' ? 'assistant' : item.role, content: item.content }));
  addMessage({ role: 'user', content: message, agentId: agent.id });
  try {
    const response = await runWithActivity(() => executeChat(resolvedProvider, [...history, { role: 'user', content: message }], {
      model: agent.model,
      authMode: 'auto',
      enableWorkspaceTools: true,
      agentId: agent.id,
      role: agent.role
    }));
    addMessage({ role: 'agent', content: response.content, agentId: agent.id });
    console.log(`\n${chalk.cyan(agent.name)}> ${response.content}\n`);
  } catch (error) {
    console.log(chalk.red(`✗ ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function runSlashCommand(input: string, root: string): Promise<boolean> {
  const parts = parseInteractiveInput(input.slice(1));
  const [command, ...args] = parts;
  if (!command) return true;
  switch (command.toLowerCase()) {
    case 'help': help(); return true;
    case 'exit':
    case 'quit': return false;
    case 'status': {
      const config = readProjectConfig(root);
      console.log(chalk.bold(`\n${config.name}`));
      console.log(`${chalk.gray('Project:')} ${root}`);
      console.log(`${chalk.gray('Agents:')} ${config.agents.length}`);
      console.log(`${chalk.gray('Active:')} ${config.activeAgent ?? 'none'}`);
      console.log(`${chalk.gray('Context messages:')} ${loadContext().length}`);
      const git = getGitStatus(root);
      console.log(`${chalk.gray('Git:')} ${git.isRepo ? `${git.branch} (${git.clean ? 'clean' : `${git.modified.length + git.untracked.length} changes`})` : 'not a git repository'}`);
      const gh = await getGitHubAuthStatus();
      console.log(`${chalk.gray('GitHub:')} ${gh.authenticated ? `✓ ${gh.username}` : '○ not connected'}`);
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
      if (!provider) { console.log('Usage: /connect <provider> [name] [role]'); return true; }
      const supported = [...providerRegistry.list(), 'custom'];
      if (!supported.includes(provider)) { console.log(chalk.red(`Unsupported provider. Use: ${supported.join(', ')}`)); return true; }
      const role = (args[2] ?? 'general') as AgentRole;
      if (!agentRoles.includes(role)) { console.log(chalk.red(`Invalid role. Use: ${agentRoles.join(', ')}`)); return true; }
      const agent = connectAgent(provider, args[1], undefined, role);
      console.log(chalk.green(`✓ Connected ${agent.name} (${provider}, ${role})`));
      return true;
    }
    case 'switch': {
      if (!args[0]) { console.log('Usage: /switch <agent>'); return true; }
      const active = switchAgent(args[0]);
      console.log(chalk.green(`✓ Active agent: ${active.name}`));
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
      console.log(chalk.gray('Running swarm...'));
      const results = await runWithActivity(() => orchestrate(task));
      for (const result of results) console.log(`\n${chalk.cyan(`[${result.agent.name}]`)}${result.success ? '' : chalk.red(' — failed')}\n${result.content}`);
      if (!noSynthesize && results.some(result => result.success)) {
        const finalAnswer = await runWithActivity(() => synthesizeResults(task, results));
        if (finalAnswer) console.log(`\n${chalk.green('✓ Final synthesis')}\n${chalk.bold(finalAnswer)}`);
      }
      return true;
    }
    case 'tasks': {
      const tasks = listTasks();
      if (!tasks.length) { console.log(chalk.gray('No tasks yet.')); return true; }
      console.log(chalk.bold('\nProject Tasks:'));
      for (const t of tasks) {
        const marker = t.status === 'completed' ? chalk.green('✓') : t.status === 'failed' ? chalk.red('✗') : chalk.yellow('●');
        console.log(`${marker} ${chalk.bold(t.id)} [${t.status}] ${t.title}${t.assignedTo ? chalk.gray(` (assigned: ${t.assignedTo})`) : ''}`);
      }
      return true;
    }
    case 'task': {
      const taskId = args[0];
      if (!taskId) { console.log('Usage: /task <taskId>'); return true; }
      const task = getTask(taskId);
      if (!task) { console.log(chalk.yellow(`Task not found: ${taskId}`)); return true; }
      console.log(chalk.bold(`\nTask ${task.id}`));
      console.log(`Title: ${task.title}`);
      console.log(`Status: ${task.status}`);
      if (task.assignedTo) console.log(`Assigned to: ${task.assignedTo}`);
      if (task.description) console.log(`Description: ${task.description}`);
      if (task.result) console.log(`Result: ${task.result}`);
      return true;
    }
    case 'message': {
      const targetAgent = args[0];
      const message = args.slice(1).join(' ').trim();
      if (!targetAgent || !message) { console.log('Usage: /message <agent> <message>'); return true; }
      const msg = messageBus.sendMessage({ from: 'user', to: targetAgent, content: message });
      console.log(chalk.green(`✓ Message sent to ${targetAgent} (id: ${msg.id})`));
      return true;
    }
    case 'delegate': {
      const targetAgent = args[0];
      const taskDesc = args.slice(1).join(' ').trim();
      if (!targetAgent || !taskDesc) { console.log('Usage: /delegate <agent> <task>'); return true; }
      const task = delegateTask('user', targetAgent, taskDesc);
      console.log(chalk.green(`✓ Task delegated to ${targetAgent} (${task.id})`));
      return true;
    }
    case 'permissions': {
      const sub = args[0];
      if (sub === 'mode' && args[1]) {
        const mode = args[1] === 'autonomous' ? 'autonomous' : 'strict';
        setPermissionMode(mode);
        console.log(chalk.green(`✓ Permission mode set to: ${mode}`));
        return true;
      }
      const mode = getPermissionMode();
      console.log(chalk.bold(`\nPermissions (Mode: ${mode})`));
      const config = readProjectConfig(root);
      for (const agent of config.agents) {
        const caps = getAgentPermissions(agent.id, agent.role);
        console.log(`• ${chalk.cyan(agent.name)} (${agent.role ?? 'general'}): ${caps.join(', ')}`);
      }
      console.log(chalk.gray('\nSet mode: /permissions mode <strict|autonomous>'));
      return true;
    }
    case 'workspace': {
      const policy = getWorkspacePolicy();
      console.log(chalk.bold(`\nWorkspace: ${policy.root}`));
      const entries = listWorkspace('.');
      console.log(`Files & directories (${entries.length} items):`);
      for (const e of entries.slice(0, 20)) {
        console.log(`  ${e.type === 'directory' ? chalk.blue(e.path + '/') : e.path}`);
      }
      if (entries.length > 20) console.log(chalk.gray(`  ...and ${entries.length - 20} more items`));
      return true;
    }
    case 'git': {
      const sub = args[0] ?? 'status';
      if (sub === 'status') {
        const s = getGitStatus();
        console.log(chalk.bold('\nGit Status:'));
        if (!s.isRepo) { console.log(chalk.yellow('Not a git repository')); return true; }
        console.log(`Branch: ${chalk.green(s.branch)}`);
        console.log(s.clean ? chalk.gray('Working tree clean') : s.raw);
        return true;
      }
      if (sub === 'diff') {
        const diff = getGitDiff();
        console.log(diff || chalk.gray('No git diff.'));
        return true;
      }
      if (sub === 'commit') {
        const msg = args.slice(1).join(' ').trim();
        if (!msg) { console.log('Usage: /git commit "<commit-message>"'); return true; }
        const res = gitCommit(msg);
        console.log(chalk.green(`✓ ${res}`));
        return true;
      }
      console.log('Usage: /git status | diff | commit "<message>"');
      return true;
    }
    case 'github': {
      const sub = args[0] ?? 'status';
      switch (sub.toLowerCase()) {
        case 'status': await githubStatus(); return true;
        case 'login': await githubLogin(args[1]); return true;
        case 'logout': githubLogout(); return true;
        case 'repos': await githubRepos(args[1] ? parseInt(args[1], 10) : 10); return true;
        case 'clone': {
          if (!args[1]) { console.log('Usage: /github clone <owner/repo>'); return true; }
          await githubClone(args[1], args[2]);
          return true;
        }
        case 'pr': await githubPrCommand(args.slice(1)); return true;
        case 'issue': await githubIssueCommand(args.slice(1)); return true;
        default:
          console.log('Usage: /github status | login | logout | repos | clone | pr | issue');
          return true;
      }
    }
    case 'agent': {
      const name = args[0];
      const config = readProjectConfig(root);
      const agent = config.agents.find(a => a.name === name || a.id === name);
      if (!agent) { console.log(chalk.yellow(`Agent not found: ${name}`)); return true; }
      console.log(chalk.bold(`\nAgent: ${agent.name}`));
      console.log(`ID: ${agent.id}`);
      console.log(`Provider: ${agent.provider}`);
      console.log(`Role: ${agent.role ?? 'general'}`);
      if (agent.model) console.log(`Model: ${agent.model}`);
      const caps = getAgentPermissions(agent.id, agent.role);
      console.log(`Permissions: ${caps.join(', ')}`);
      return true;
    }
    case 'activity': {
      const msgs = messageBus.loadMessages();
      console.log(chalk.bold(`\nRecent Activity (${msgs.length} events):`));
      for (const m of msgs.slice(-15)) {
        console.log(`${chalk.gray(m.timestamp.slice(11, 19))} ${chalk.cyan(m.from)} -> ${chalk.yellow(m.to)} [${m.type}]: ${m.content}`);
      }
      return true;
    }
    case 'login': {
      const provider = args[0];
      if (!provider || provider === 'gemini') {
        console.log(chalk.yellow('Use /login openai or /login anthropic for provider-owned account login. Gemini account login must be completed in Gemini CLI itself.'));
        return true;
      }
      await startAccountLogin(provider);
      console.log(chalk.green(`✓ ${provider} account login completed`));
      return true;
    }
    case 'logout': {
      if (!args[0]) { console.log('Usage: /logout <provider>'); return true; }
      console.log(chalk.yellow('Use `agentmesh logout <provider>` from the project shell for provider logout.'));
      return true;
    }
    case 'chat':
      await chatOnce(args.join(' ').trim());
      return true;
    default:
      console.log(chalk.yellow(`Unknown slash command: /${command}. Type /help for available commands.`));
      return true;
  }
}

export async function runInteractiveCommand(input: string, root: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/')) return runSlashCommand(trimmed, root);
  await chatOnce(trimmed);
  return true;
}

export async function startInteractiveMode(): Promise<void> {
  const root = requireProject();
  await renderHeader(root);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let running = true;
  const onSigint = () => console.log(chalk.gray('\nUse /exit to leave AgentMesh.'));
  rl.on('SIGINT', onSigint);
  try {
    while (running) {
      const line = await new Promise<string>(resolve => rl.question(chalk.green('You › '), resolve));
      try { running = await runInteractiveCommand(line, root); }
      catch (error) { console.log(chalk.red(`✗ ${error instanceof Error ? error.message : String(error)}`)); }
    }
  } finally { rl.off('SIGINT', onSigint); rl.close(); }
  console.log(chalk.gray('Goodbye 👋'));
}
