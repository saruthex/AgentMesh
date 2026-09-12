#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initProject, findProjectRoot, readProjectConfig } from './storage/project.js';
import { connectAgent, switchAgent } from './agents/registry.js';
import { addMessage, loadContext } from './context/store.js';

const program = new Command();
program.name('agentmesh').description('Provider-agnostic multi-agent orchestration for the terminal').version('0.2.0');

program.command('init [name]').description('Create an AgentMesh project').action((name?: string) => {
  const root = initProject(name);
  console.log(chalk.green('✓ AgentMesh project created'));
  console.log(chalk.cyan(root));
});

program.command('connect <provider>').option('-n, --name <name>').option('-m, --model <model>')
  .description('Register an AI provider agent with this project')
  .action((provider: string, options) => {
    const supported = ['openai', 'anthropic', 'gemini', 'custom'];
    if (!supported.includes(provider)) throw new Error('Unsupported provider. Use: openai, anthropic, gemini, or custom');
    const agent = connectAgent(provider, options.name, options.model);
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
    console.log(`• ${agent.name} [${agent.provider}]${agent.model ? ` - ${agent.model}` : ''}${active}`);
  }
});

program.command('switch <agent>').description('Switch the active agent').action((agent: string) => {
  const active = switchAgent(agent);
  console.log(chalk.green(`✓ Active agent: ${active.name}`));
});

program.command('chat <message>').description('Append a user message to shared project context').action((message: string) => {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const config = readProjectConfig(root);
  if (!config.activeAgent) throw new Error('No active agent. Run: agentmesh connect <provider>');
  addMessage({ role: 'user', content: message, agentId: config.activeAgent });
  console.log(chalk.green('✓ Message saved to shared context'));
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

program.parse();
