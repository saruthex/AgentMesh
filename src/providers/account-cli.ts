import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import type { ChatResponse, ProviderMessage } from './types.js';
import { emitActivity } from '../workspace/activity.js';

interface AccountCliSpec {
  provider: string;
  command: string;
  envCommand?: string;
  loginArgs: string[];
  logoutArgs?: string[];
  promptArgs: (prompt: string) => string[];
  modelArgs?: (model: string) => string[];
}

const SPECS: Record<string, AccountCliSpec> = {
  anthropic: {
    provider: 'anthropic',
    command: 'claude',
    loginArgs: [],
    promptArgs: prompt => ['-p', prompt, '--output-format', 'text'],
    modelArgs: model => ['--model', model]
  },
  openai: {
    provider: 'openai',
    command: 'codex',
    envCommand: 'AGENTMESH_OPENAI_CLI',
    loginArgs: ['login'],
    logoutArgs: ['logout'],
    promptArgs: prompt => ['exec', '--ephemeral', prompt],
    modelArgs: model => ['--model', model]
  }
};

function specFor(provider: string): AccountCliSpec {
  const spec = SPECS[provider];
  if (!spec) throw new Error(`No provider-approved account CLI bridge is configured for provider: ${provider}`);
  return spec;
}

function commandFor(spec: AccountCliSpec): string {
  return process.env[spec.envCommand ?? '']?.trim() || spec.command;
}

function commandStatus(command: string, args: string[] = ['--version']): { available: boolean; broken: boolean; output: string } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  const broken = result.status !== 0 && /missing optional dependency|cannot find module|module not found|no such file or directory/i.test(output);
  return { available: result.status === 0, broken, output };
}

function commandAvailable(command: string): boolean {
  return commandStatus(command).available;
}

function commandBroken(command: string): boolean {
  return commandStatus(command).broken;
}

export function accountCliInstalled(provider: string): boolean {
  return commandAvailable(commandFor(specFor(provider)));
}

export function accountCliLogin(provider: string): Promise<void> {
  const spec = specFor(provider);
  const command = commandFor(spec);
  if (commandBroken(command)) {
    throw new Error(`${command} is installed but not runnable in this environment. Reinstall or use a provider CLI build compatible with your platform (for example, a Termux/Android build on ARM64).`);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, spec.loginArgs, { stdio: 'inherit', shell: false });
    child.once('error', error => reject(new Error(`Unable to start ${command}: ${error.message}`)));
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} login exited with code ${code ?? 'unknown'}.`)));
  });
}

export function accountCliLogout(provider: string): Promise<void> {
  const spec = specFor(provider);
  const command = commandFor(spec);
  const args = spec.logoutArgs;
  if (!args?.length) throw new Error(`The ${provider} account CLI does not expose a supported logout command.`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.once('error', (error: Error) => reject(new Error(`Unable to start ${command}: ${error.message}`)));
    child.once('exit', (code: number | null) => code === 0 ? resolve() : reject(new Error(`${command} logout exited with code ${code ?? 'unknown'}.`)));
  });
}

function buildPrompt(messages: ProviderMessage[]): string {
  return messages.map(message => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
}

export function executeAccountCli(provider: string, messages: ProviderMessage[], model?: string): Promise<ChatResponse> {
  return executeAccountCliInternal(provider, messages, model, false);
}

/**
 * Run a provider-owned coding CLI in the AgentMesh project directory.
 * The CLI itself owns the filesystem/tool execution model, so AgentMesh does
 * not need to copy credentials or expose a second token path.
 */
export function executeAccountCliWorkspace(provider: string, messages: ProviderMessage[], model?: string, cwd = process.cwd()): Promise<ChatResponse> {
  return executeAccountCliInternal(provider, messages, model, true, cwd);
}

function executeAccountCliInternal(
  provider: string,
  messages: ProviderMessage[],
  model: string | undefined,
  workspaceMode: boolean,
  cwd = process.cwd()
): Promise<ChatResponse> {
  const spec = specFor(provider);
  const command = commandFor(spec);
  const prompt = buildPrompt(messages);
  const baseArgs = spec.promptArgs(prompt);
  const args = workspaceMode && provider === 'openai'
    ? [...baseArgs, '-s', 'workspace-write', '--ask-for-approval', 'never', ...(model && spec.modelArgs ? spec.modelArgs(model) : [])]
    : [...baseArgs, ...(model && spec.modelArgs ? spec.modelArgs(model) : [])];

  return new Promise((resolve, reject) => {
    emitActivity({ kind: 'working', message: workspaceMode ? 'Working in workspace…' : 'Thinking…' });
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      if (workspaceMode) {
        const lines = text.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
        for (const line of lines.slice(-3)) emitActivity({ kind: 'tool', message: line.slice(0, 140) });
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.once('error', error => reject(new Error(`Unable to start ${command}: ${error.message}`)));
    child.once('exit', code => {
      const content = stdout.trim();
      if (code !== 0) {
        const detail = stderr.trim() || content || `exit code ${code ?? 'unknown'}`;
        reject(new Error(`${command} account execution failed: ${detail}`));
        return;
      }
      if (!content) {
        reject(new Error(`${command} returned an empty response.`));
        return;
      }
      emitActivity({ kind: 'done', message: 'Done' });
      resolve({ content, model });
    });
  });
}

export function accountCliProviders(): string[] {
  return Object.keys(SPECS);
}

export function accountCliAuthenticated(provider: string): boolean {
  const command = commandFor(specFor(provider));
  if (!commandAvailable(command)) return false;
  if (provider === 'openai') {
    const result = spawnSync(command, ['login', 'status'], { stdio: 'ignore', shell: false });
    return result.status === 0;
  }
  return true;
}
