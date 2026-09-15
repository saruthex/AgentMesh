import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export interface GitStatusInfo {
  isRepo: boolean;
  branch?: string;
  clean?: boolean;
  modified: string[];
  untracked: string[];
  staged: string[];
  raw: string;
}

export interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

function runGit(args: string, cwd: string = process.cwd()): string {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (error: any) {
    const err = error?.stderr?.toString()?.trim() || error?.message || String(error);
    throw new Error(`Git error: ${err}`);
  }
}

export function isGitRepo(cwd: string = process.cwd()): boolean {
  try {
    const res = runGit('rev-parse --is-inside-work-tree', cwd);
    return res === 'true';
  } catch {
    return false;
  }
}

export function getCurrentBranch(cwd: string = process.cwd()): string | null {
  try {
    return runGit('rev-parse --abbrev-ref HEAD', cwd);
  } catch {
    return null;
  }
}

export function getGitStatus(cwd: string = process.cwd()): GitStatusInfo {
  if (!isGitRepo(cwd)) {
    return {
      isRepo: false,
      modified: [],
      untracked: [],
      staged: [],
      raw: 'Not a git repository'
    };
  }

  const branch = getCurrentBranch(cwd) ?? 'HEAD';
  const raw = runGit('status --porcelain', cwd);
  const modified: string[] = [];
  const untracked: string[] = [];
  const staged: string[] = [];

  if (raw) {
    const lines = raw.split('\n');
    for (const line of lines) {
      if (!line) continue;
      const indexStatus = line[0];
      const workStatus = line[1];
      const file = line.slice(3).trim();

      if (indexStatus === '?' && workStatus === '?') {
        untracked.push(file);
      } else {
        if (indexStatus && indexStatus !== ' ' && indexStatus !== '?') {
          staged.push(file);
        }
        if (workStatus && workStatus !== ' ' && workStatus !== '?') {
          modified.push(file);
        }
      }
    }
  }

  return {
    isRepo: true,
    branch,
    clean: modified.length === 0 && untracked.length === 0 && staged.length === 0,
    modified,
    untracked,
    staged,
    raw
  };
}

export function getGitDiff(cwd: string = process.cwd(), options: { cached?: boolean; file?: string } = {}): string {
  if (!isGitRepo(cwd)) throw new Error('Not a git repository.');
  const cachedFlag = options.cached ? '--cached ' : '';
  const fileTarget = options.file ? ` -- "${options.file}"` : '';
  return runGit(`diff ${cachedFlag}${fileTarget}`, cwd);
}

export function getGitLog(cwd: string = process.cwd(), limit = 10): GitLogEntry[] {
  if (!isGitRepo(cwd)) throw new Error('Not a git repository.');
  const format = '%h|%an|%ad|%s';
  const raw = runGit(`log -n ${limit} --format="${format}" --date=short`, cwd);
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, author, date, ...rest] = line.split('|');
    return {
      hash: hash ?? '',
      author: author ?? '',
      date: date ?? '',
      message: rest.join('|')
    };
  });
}

export function gitBranch(cwd: string = process.cwd(), newBranch?: string): string {
  if (!isGitRepo(cwd)) throw new Error('Not a git repository.');
  if (newBranch) {
    runGit(`branch "${newBranch}"`, cwd);
    return `Created branch ${newBranch}`;
  }
  return runGit('branch --list', cwd);
}

export function gitCheckout(target: string, create = false, cwd: string = process.cwd()): string {
  if (!isGitRepo(cwd)) throw new Error('Not a git repository.');
  const createFlag = create ? '-b ' : '';
  return runGit(`checkout ${createFlag}"${target}"`, cwd);
}

export function gitCommit(message: string, files?: string[], cwd: string = process.cwd()): string {
  if (!isGitRepo(cwd)) throw new Error('Not a git repository.');
  if (files && files.length > 0) {
    const fileArgs = files.map(f => `"${f}"`).join(' ');
    runGit(`add ${fileArgs}`, cwd);
  } else {
    runGit('add -A', cwd);
  }
  const escaped = message.replace(/"/g, '\\"');
  return runGit(`commit -m "${escaped}"`, cwd);
}
