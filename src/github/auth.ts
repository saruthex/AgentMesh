import { execSync } from 'node:child_process';
import { getCredential, saveCredential, removeCredential } from '../providers/credentials.js';
import type { GitHubAuthStatus, GitHubUser } from './types.js';

const GITHUB_API_URL = 'https://api.github.com';

function ghCliToken(): string | null {
  try {
    const output = execSync('gh auth token 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    const token = output.trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function getGitHubToken(): { token: string; source: 'stored' | 'env' | 'gh-cli' } | null {
  // 1. Check stored credential first
  const stored = getCredential('github');
  if (stored?.accessToken) {
    return { token: stored.accessToken, source: 'stored' };
  }

  // 2. Check environment variable
  const envToken = process.env.GITHUB_TOKEN?.trim();
  if (envToken) {
    return { token: envToken, source: 'env' };
  }

  // 3. Check official gh CLI bridge
  const cliToken = ghCliToken();
  if (cliToken) {
    return { token: cliToken, source: 'gh-cli' };
  }

  return null;
}

export async function verifyGitHubToken(token: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AgentMesh-CLI'
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as any;
    throw new Error(data?.message ?? `GitHub API error (${response.status}): ${response.statusText}`);
  }

  const user = await response.json() as GitHubUser;
  return user;
}

export async function saveGitHubToken(token: string, accountLabel?: string): Promise<{ username: string }> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('GitHub token cannot be empty.');

  const user = await verifyGitHubToken(trimmed);
  saveCredential({
    provider: 'github',
    accessToken: trimmed,
    accountLabel: accountLabel ?? user.login
  });

  return { username: user.login };
}

export function removeGitHubToken(): boolean {
  return removeCredential('github');
}

export async function getGitHubAuthStatus(): Promise<GitHubAuthStatus> {
  const current = getGitHubToken();
  if (!current) {
    return {
      authenticated: false,
      message: 'Not authenticated. Use `agentmesh github login` or `/github login`.'
    };
  }

  try {
    const user = await verifyGitHubToken(current.token);
    return {
      authenticated: true,
      username: user.login,
      source: current.source
    };
  } catch (error) {
    return {
      authenticated: false,
      source: current.source,
      message: `Invalid GitHub token (${error instanceof Error ? error.message : String(error)})`
    };
  }
}
