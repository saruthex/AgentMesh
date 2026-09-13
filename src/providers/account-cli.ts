import { spawn, spawnSync } from 'node:child_process';
import type { ChatResponse, ProviderMessage } from './types.js';

interface AccountCliSpec {
  provider: string;
  command: string;
  envCommand?: string;
  loginArgs: string[];
  logoutArgs?: string[];
  promptArgs: (prompt: string) => string[];
  modelArgs?: (model: string) => string[];
}

// These bridges delegate to provider-owned CLIs without reading or copying
// their credentials. Gemini is intentionally excluded because Google's
// Gemini CLI terms prohibit third-party software from piggybacking on its
// OAuth/backend services.
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
  if (!args?.length) {
    throw new Error(`The ${provider} account CLI does not expose a supported logout command.`);
  }
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
  const spec = specFor(provider);
  const command = commandFor(spec);
  const prompt = buildPrompt(messages);
  const args = [...spec.promptArgs(prompt), ...(model && spec.modelArgs ? spec.modelArgs(model) : [])];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
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

  // Codex exposes a non-interactive account status command. For Claude Code
  // there is no portable non-interactive status API we can safely depend on,
  // so installation remains the only supported readiness signal.
  if (provider === 'openai') {
    const result = spawnSync(command, ['login', 'status'], { stdio: 'ignore', shell: false });
    return result.status === 0;
  }

  return true;
}
