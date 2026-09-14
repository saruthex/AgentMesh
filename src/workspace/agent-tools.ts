import { createWorkspaceDirectory, deleteWorkspacePath, listWorkspace, readWorkspaceFile, writeWorkspaceFile, type WorkspaceEntry } from './files.js';

export const workspaceTools = {
  list(relativePath = '.'): WorkspaceEntry[] { return listWorkspace(relativePath); },
  read(relativePath: string): string { return readWorkspaceFile(relativePath); },
  write(relativePath: string, content: string): void { writeWorkspaceFile(relativePath, content); },
  mkdir(relativePath: string): void { createWorkspaceDirectory(relativePath); },
  delete(relativePath: string): void { deleteWorkspacePath(relativePath); }
};
