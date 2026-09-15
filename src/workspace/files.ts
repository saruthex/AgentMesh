import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../storage/project.js';

export type WorkspaceWriteMode = 'workspace';

export interface WorkspaceEntry {
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
}

export interface WorkspacePolicy {
  mode: WorkspaceWriteMode;
  root: string;
  allowWrite: boolean;
}

function assertInside(root: string, target: string): string {
  const normalizedRoot = path.resolve(root);
  const resolved = path.resolve(target);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error(`Workspace access denied: path escapes project root: ${target}`);
  }
  assertNoSymlinks(normalizedRoot, resolved);
  return resolved;
}

/**
 * A lexical path check alone is not sufficient: a path such as
 * `workspace/link/secret.txt` can still escape if `link` is a symlink. Reject
 * symlinks in every existing component so reads, writes, and deletes all keep
 * their promise of staying inside the workspace.
 */
function assertNoSymlinks(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (!relative) return;

  let current = root;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error(`Workspace access denied: path contains a symbolic link: ${relative}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }
}

export function getWorkspacePolicy(cwd = process.cwd()): WorkspacePolicy {
  const root = findProjectRoot(cwd);
  if (!root) throw new Error('No AgentMesh project found. Run `agentmesh init` first.');
  return { mode: 'workspace', root, allowWrite: true };
}

export function workspacePath(relativePath: string, cwd = process.cwd()): string {
  const { root } = getWorkspacePolicy(cwd);
  return assertInside(root, path.join(root, relativePath));
}

export function listWorkspace(relativePath = '.', cwd = process.cwd()): WorkspaceEntry[] {
  const dir = workspacePath(relativePath, cwd);
  if (!fs.existsSync(dir)) throw new Error(`Workspace path does not exist: ${relativePath}`);
  if (!fs.statSync(dir).isDirectory()) throw new Error(`Workspace path is not a directory: ${relativePath}`);
  return fs.readdirSync(dir, { withFileTypes: true }).map(entry => {
    const full = path.join(dir, entry.name);
    const stat = fs.lstatSync(full);
    const type = stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : 'file';
    return { path: path.relative(getWorkspacePolicy(cwd).root, full) || '.', type, size: stat.isFile() ? stat.size : undefined };
  });
}

export function readWorkspaceFile(relativePath: string, cwd = process.cwd()): string {
  const file = workspacePath(relativePath, cwd);
  if (!fs.existsSync(file)) throw new Error(`File does not exist: ${relativePath}`);
  if (!fs.statSync(file).isFile()) throw new Error(`Not a file: ${relativePath}`);
  return fs.readFileSync(file, 'utf8');
}

export function writeWorkspaceFile(relativePath: string, content: string, cwd = process.cwd()): void {
  const { root, allowWrite } = getWorkspacePolicy(cwd);
  if (!allowWrite) throw new Error('Workspace is read-only.');
  const file = assertInside(root, path.join(root, relativePath));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

export function createWorkspaceDirectory(relativePath: string, cwd = process.cwd()): void {
  const { root, allowWrite } = getWorkspacePolicy(cwd);
  if (!allowWrite) throw new Error('Workspace is read-only.');
  fs.mkdirSync(assertInside(root, path.join(root, relativePath)), { recursive: true });
}

export function deleteWorkspacePath(relativePath: string, cwd = process.cwd()): void {
  const { root, allowWrite } = getWorkspacePolicy(cwd);
  if (!allowWrite) throw new Error('Workspace is read-only.');
  const target = assertInside(root, path.join(root, relativePath));
  if (target === path.resolve(root)) throw new Error('Refusing to delete the workspace root.');
  fs.rmSync(target, { recursive: true, force: false });
}

export function moveWorkspaceFile(sourceRelative: string, destRelative: string, cwd = process.cwd()): void {
  const { root, allowWrite } = getWorkspacePolicy(cwd);
  if (!allowWrite) throw new Error('Workspace is read-only.');
  const source = assertInside(root, path.join(root, sourceRelative));
  const dest = assertInside(root, path.join(root, destRelative));
  if (!fs.existsSync(source)) throw new Error(`Source path does not exist: ${sourceRelative}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(source, dest);
}

export interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

export function searchWorkspaceFiles(query: string, relativePath = '.', cwd = process.cwd(), limit = 50): SearchMatch[] {
  const { root } = getWorkspacePolicy(cwd);
  const dir = assertInside(root, path.join(root, relativePath));
  if (!fs.existsSync(dir)) throw new Error(`Path does not exist: ${relativePath}`);

  const results: SearchMatch[] = [];
  const q = query.toLowerCase();

  function scan(current: string) {
    if (results.length >= limit) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      const full = path.join(current, entry.name);
      // Skip symlinks to avoid escapes
      try {
        if (fs.lstatSync(full).isSymbolicLink()) continue;
      } catch {
        continue;
      }
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.agentmesh') continue;

      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= limit) break;
            const line = lines[i]!;
            if (line.toLowerCase().includes(q)) {
              results.push({
                file: path.relative(root, full),
                line: i + 1,
                content: line.trim()
              });
            }
          }
        } catch {
          // Skip binary or unreadable files
        }
      }
    }
  }

  scan(dir);
  return results;
}

