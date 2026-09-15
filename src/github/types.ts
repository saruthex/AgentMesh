export interface GitHubUser {
  login: string;
  id: number;
  name?: string;
  email?: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  default_branch: string;
  clone_url: string;
  ssh_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  html_url: string;
  user?: { login: string };
  labels?: Array<{ name: string }>;
  created_at: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  html_url: string;
  user?: { login: string };
  head: { ref: string; sha?: string };
  base: { ref: string };
  merged?: boolean;
  created_at: string;
}

export interface GitHubCiStatus {
  state: 'success' | 'failure' | 'pending' | 'unknown';
  total_count: number;
  workflow_runs?: Array<{
    id: number;
    name: string;
    status: string;
    conclusion?: string;
    html_url: string;
  }>;
}

export interface GitHubAuthStatus {
  authenticated: boolean;
  username?: string;
  source?: 'stored' | 'env' | 'gh-cli';
  message?: string;
}
