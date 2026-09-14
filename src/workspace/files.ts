import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../storage/project.js';

export type WorkspaceWriteMode = 'workspace';

export interface WorkspaceEntry {
  path: string;
  type: 'file' | 'directory';
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
  return resolved;
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
    const stat = fs.statSync(full);
    return { path: path.relative(getWorkspacePolicy(cwd).root, full) || '.', type: entry.isDirectory() ? 'directory' : 'file', size: entry.isFile() ? stat.size : undefined };
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
