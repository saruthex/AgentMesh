import chalk from 'chalk';
import { createInterface } from 'node:readline';
import { getGitHubAuthStatus, removeGitHubToken, saveGitHubToken, getGitHubToken } from '../github/auth.js';
import { listRepositories, cloneRepo, parseRepoSlug, createIssue, getIssue, createPullRequest, getPullRequest, getCiStatus } from '../github/client.js';

export async function githubStatus(): Promise<void> {
  const status = await getGitHubAuthStatus();
  console.log(chalk.bold('\nGitHub'));
  if (status.authenticated) {
    console.log(chalk.green('✓ Authenticated'));
    console.log(`User: ${chalk.cyan(status.username ?? 'unknown')}`);
    if (status.source) {
      console.log(chalk.gray(`Auth source: ${status.source}`));
    }
  } else {
    console.log(chalk.yellow('○ Not authenticated'));
    console.log(chalk.gray(status.message ?? 'Use /github login or `agentmesh github login` to connect.'));
  }
}

export async function githubLogin(tokenArg?: string): Promise<void> {
  if (tokenArg) {
    const res = await saveGitHubToken(tokenArg);
    console.log(chalk.green(`✓ GitHub authenticated as ${res.username}`));
    return;
  }

  // Check if gh cli is already authenticated
  const current = getGitHubToken();
  if (current?.source === 'gh-cli') {
    const status = await getGitHubAuthStatus();
    if (status.authenticated) {
      // Save it explicitly to AgentMesh credential store
      await saveGitHubToken(current.token, status.username);
      console.log(chalk.green(`✓ Connected GitHub account from GitHub CLI: ${status.username}`));
      return;
    }
  }

  if (process.env.GITHUB_TOKEN) {
    const res = await saveGitHubToken(process.env.GITHUB_TOKEN);
    console.log(chalk.green(`✓ Connected GitHub account from GITHUB_TOKEN: ${res.username}`));
    return;
  }

  // Prompt user for Personal Access Token
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const token = await new Promise<string>(resolve => {
      rl.question('Enter GitHub Personal Access Token (repo, read:org scopes): ', resolve);
    });
    if (!token.trim()) {
      console.log(chalk.yellow('GitHub login cancelled: empty token.'));
      return;
    }
    const res = await saveGitHubToken(token.trim());
    console.log(chalk.green(`✓ GitHub authenticated as ${res.username}`));
  } finally {
    rl.close();
  }
}

export function githubLogout(): void {
  const removed = removeGitHubToken();
  if (removed) {
    console.log(chalk.green('✓ GitHub credentials removed from AgentMesh store.'));
  } else {
    console.log(chalk.yellow('No stored GitHub credentials found. (Note: environment GITHUB_TOKEN or gh CLI may still be active)'));
  }
}

export async function githubRepos(limit = 10): Promise<void> {
  const status = await getGitHubAuthStatus();
  if (!status.authenticated) {
    console.log(chalk.yellow('Please login first: `agentmesh github login` or `/github login`'));
    return;
  }

  console.log(chalk.bold(`\nRepositories for ${status.username}:`));
  const repos = await listRepositories(limit);
  if (!repos.length) {
    console.log(chalk.gray('No repositories found.'));
    return;
  }

  for (const repo of repos) {
    const priv = repo.private ? chalk.yellow('[private]') : chalk.gray('[public]');
    console.log(`• ${chalk.cyan(repo.full_name)} ${priv} ${chalk.gray(repo.description ?? '')}`);
  }
}

export async function githubClone(repoSlug: string, destination?: string): Promise<void> {
  try {
    const slug = parseRepoSlug(repoSlug);
    const cloneUrl = `https://github.com/${slug.owner}/${slug.repo}.git`;
    console.log(chalk.gray(`Cloning ${cloneUrl}...`));
    const out = cloneRepo(cloneUrl, destination);
    console.log(chalk.green(`✓ Cloned ${slug.owner}/${slug.repo}`));
    if (out) console.log(chalk.gray(out));
  } catch (error) {
    console.log(chalk.red(`✗ Clone failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

export async function githubPrCommand(args: string[]): Promise<void> {
  // Usage: pr create <repo> <title> <head> [base]
  //    or: pr view <repo> <number>
  const sub = args[0] ?? 'list';
  if (sub === 'create') {
    const [, repo, title, head, base] = args;
    if (!repo || !title || !head) {
      console.log('Usage: /github pr create <owner/repo> "<title>" <head-branch> [base-branch]');
      return;
    }
    const { owner, repo: r } = parseRepoSlug(repo);
    const pr = await createPullRequest(owner, r, { title, head, base });
    console.log(chalk.green(`✓ Pull request created: #${pr.number} ${pr.title}`));
    console.log(chalk.cyan(pr.html_url));
    return;
  }

  if (sub === 'view') {
    const [, repo, prNum] = args;
    if (!repo || !prNum) {
      console.log('Usage: /github pr view <owner/repo> <number>');
      return;
    }
    const { owner, repo: r } = parseRepoSlug(repo);
    const pr = await getPullRequest(owner, r, parseInt(prNum, 10));
    console.log(chalk.bold(`\n#${pr.number} ${pr.title} [${pr.state}]`));
    console.log(chalk.gray(`Branch: ${pr.head.ref} -> ${pr.base.ref}`));
    if (pr.body) console.log(`\n${pr.body}\n`);
    console.log(chalk.cyan(pr.html_url));
    return;
  }

  console.log('Usage: /github pr create <owner/repo> "<title>" <head-branch> [base-branch] | /github pr view <owner/repo> <number>');
}

export async function githubIssueCommand(args: string[]): Promise<void> {
  const sub = args[0] ?? 'help';
  if (sub === 'create') {
    const [, repo, title, body] = args;
    if (!repo || !title) {
      console.log('Usage: /github issue create <owner/repo> "<title>" ["body"]');
      return;
    }
    const { owner, repo: r } = parseRepoSlug(repo);
    const issue = await createIssue(owner, r, { title, body });
    console.log(chalk.green(`✓ Issue created: #${issue.number} ${issue.title}`));
    console.log(chalk.cyan(issue.html_url));
    return;
  }

  if (sub === 'view') {
    const [, repo, num] = args;
    if (!repo || !num) {
      console.log('Usage: /github issue view <owner/repo> <number>');
      return;
    }
    const { owner, repo: r } = parseRepoSlug(repo);
    const issue = await getIssue(owner, r, parseInt(num, 10));
    console.log(chalk.bold(`\n#${issue.number} ${issue.title} [${issue.state}]`));
    if (issue.body) console.log(`\n${issue.body}\n`);
    console.log(chalk.cyan(issue.html_url));
    return;
  }

  console.log('Usage: /github issue create <owner/repo> "<title>" ["body"] | /github issue view <owner/repo> <number>');
}
