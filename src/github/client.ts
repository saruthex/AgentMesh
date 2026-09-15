import { execSync } from 'node:child_process';
import { getGitHubToken } from './auth.js';
import type { GitHubRepo, GitHubIssue, GitHubPullRequest, GitHubCiStatus } from './types.js';

const GITHUB_API_URL = 'https://api.github.com';

function requireToken(): string {
  const current = getGitHubToken();
  if (!current) {
    throw new Error('GitHub is not connected. Run `agentmesh github login` or set GITHUB_TOKEN.');
  }
  return current.token;
}

async function githubFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = requireToken();
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('User-Agent', 'AgentMesh-CLI');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({})) as any;

  if (!response.ok) {
    const msg = data?.message ?? `GitHub API error (${response.status}): ${response.statusText}`;
    throw new Error(msg);
  }

  return data as T;
}

export function parseRepoSlug(slugOrUrl: string): { owner: string; repo: string } {
  const trimmed = slugOrUrl.trim();
  const stripped = trimmed.replace(/^(?:https?:\/\/github\.com\/|git@github\.com:)/, '');
  const match = stripped.match(/^([^/\s]+)\/([^/\s#]+?)(?:\.git)?$/);
  if (match && match[1] && match[2]) {
    return { owner: match[1], repo: match[2] };
  }
  throw new Error(`Invalid repository format: "${slugOrUrl}". Expected "owner/repo" or GitHub URL.`);
}

export async function listRepositories(limit = 10): Promise<GitHubRepo[]> {
  const data = await githubFetch<any[]>(`/user/repos?sort=updated&per_page=${limit}&affiliation=owner,collaborator`);
  return data.map(repo => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    html_url: repo.html_url,
    description: repo.description,
    default_branch: repo.default_branch,
    clone_url: repo.clone_url,
    ssh_url: repo.ssh_url
  }));
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  const data = await githubFetch<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    private: data.private,
    html_url: data.html_url,
    description: data.description,
    default_branch: data.default_branch,
    clone_url: data.clone_url,
    ssh_url: data.ssh_url
  };
}

export async function createIssue(owner: string, repo: string, data: { title: string; body?: string; labels?: string[] }): Promise<GitHubIssue> {
  const payload = {
    title: data.title,
    body: data.body ?? '',
    ...(data.labels?.length ? { labels: data.labels } : {})
  };
  const res = await githubFetch<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return {
    id: res.id,
    number: res.number,
    title: res.title,
    body: res.body,
    state: res.state,
    html_url: res.html_url,
    user: res.user ? { login: res.user.login } : undefined,
    labels: Array.isArray(res.labels) ? res.labels.map((l: any) => ({ name: l.name })) : [],
    created_at: res.created_at
  };
}

export async function getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
  const res = await githubFetch<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`);
  return {
    id: res.id,
    number: res.number,
    title: res.title,
    body: res.body,
    state: res.state,
    html_url: res.html_url,
    user: res.user ? { login: res.user.login } : undefined,
    labels: Array.isArray(res.labels) ? res.labels.map((l: any) => ({ name: l.name })) : [],
    created_at: res.created_at
  };
}

export async function createPullRequest(
  owner: string,
  repo: string,
  data: { title: string; head: string; base?: string; body?: string }
): Promise<GitHubPullRequest> {
  // If base not provided, fetch default branch of repo
  let baseBranch = data.base;
  if (!baseBranch) {
    const repoInfo = await getRepo(owner, repo);
    baseBranch = repoInfo.default_branch;
  }

  const payload = {
    title: data.title,
    head: data.head,
    base: baseBranch,
    body: data.body ?? ''
  };

  const res = await githubFetch<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    id: res.id,
    number: res.number,
    title: res.title,
    body: res.body,
    state: res.state,
    html_url: res.html_url,
    user: res.user ? { login: res.user.login } : undefined,
    head: { ref: res.head?.ref, sha: res.head?.sha },
    base: { ref: res.base?.ref },
    merged: res.merged,
    created_at: res.created_at
  };
}

export async function getPullRequest(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequest> {
  const res = await githubFetch<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`);
  return {
    id: res.id,
    number: res.number,
    title: res.title,
    body: res.body,
    state: res.state,
    html_url: res.html_url,
    user: res.user ? { login: res.user.login } : undefined,
    head: { ref: res.head?.ref, sha: res.head?.sha },
    base: { ref: res.base?.ref },
    merged: res.merged,
    created_at: res.created_at
  };
}

export async function getCiStatus(owner: string, repo: string, ref?: string): Promise<GitHubCiStatus> {
  const targetRef = ref ?? 'HEAD';
  // Use check-runs endpoint
  try {
    const data = await githubFetch<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(targetRef)}/check-runs`);
    const total = data.total_count ?? 0;
    const runs = Array.isArray(data.check_runs) ? data.check_runs : [];
    let state: 'success' | 'failure' | 'pending' | 'unknown' = 'unknown';

    if (total > 0) {
      const anyFailed = runs.some((r: any) => r.conclusion === 'failure');
      const anyInProgress = runs.some((r: any) => r.status !== 'completed');
      if (anyFailed) state = 'failure';
      else if (anyInProgress) state = 'pending';
      else state = 'success';
    }

    return {
      state,
      total_count: total,
      workflow_runs: runs.map((r: any) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        html_url: r.html_url
      }))
    };
  } catch {
    return { state: 'unknown', total_count: 0, workflow_runs: [] };
  }
}

export function cloneRepo(repoUrl: string, destination?: string): string {
  const target = destination ? ` "${destination}"` : '';
  const output = execSync(`git clone "${repoUrl}"${target}`, { encoding: 'utf8', timeout: 30000 });
  return output.trim();
}
