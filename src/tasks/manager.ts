import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { findProjectRoot } from '../storage/project.js';
import type { ProjectTask, TaskStatus, ReviewStatus } from './types.js';

const TASKS_FILE = 'tasks.json';
const DIR = '.agentmesh';

function getTasksPath(root?: string): string {
  const projectRoot = root ?? findProjectRoot(process.cwd());
  if (!projectRoot) throw new Error('No AgentMesh project found. Run `agentmesh init` first.');
  return path.join(projectRoot, DIR, TASKS_FILE);
}

export function loadTasks(root?: string): ProjectTask[] {
  try {
    const file = getTasksPath(root);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export function saveTasks(tasks: ProjectTask[], root?: string): void {
  const file = getTasksPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(tasks, null, 2) + '\n', 'utf8');
}

export function createTask(data: {
  title: string;
  description?: string;
  assignedTo?: string;
  createdBy?: string;
  dependencies?: string[];
  filesOwned?: string[];
}, root?: string): ProjectTask {
  const tasks = loadTasks(root);
  const now = new Date().toISOString();
  const task: ProjectTask = {
    id: `task-${crypto.randomUUID().slice(0, 8)}`,
    title: data.title,
    description: data.description,
    status: 'pending',
    assignedTo: data.assignedTo,
    createdBy: data.createdBy ?? 'user',
    dependencies: data.dependencies ?? [],
    filesOwned: data.filesOwned ?? [],
    reviewStatus: 'not_required',
    createdAt: now,
    updatedAt: now
  };
  tasks.push(task);
  saveTasks(tasks, root);
  return task;
}

export function getTask(id: string, root?: string): ProjectTask | undefined {
  return loadTasks(root).find(t => t.id === id);
}

export function listTasks(filter?: { status?: TaskStatus; assignedTo?: string }, root?: string): ProjectTask[] {
  let tasks = loadTasks(root);
  if (filter?.status) {
    tasks = tasks.filter(t => t.status === filter.status);
  }
  if (filter?.assignedTo) {
    tasks = tasks.filter(t => t.assignedTo === filter.assignedTo);
  }
  return tasks;
}

export function updateTask(id: string, updates: Partial<ProjectTask>, root?: string): ProjectTask {
  const tasks = loadTasks(root);
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) throw new Error(`Task not found: ${id}`);
  const existing = tasks[index]!;
  const updated: ProjectTask = {
    ...existing,
    ...updates,
    id: existing.id, // prevent ID change
    updatedAt: new Date().toISOString()
  };
  tasks[index] = updated;
  saveTasks(tasks, root);
  return updated;
}

export function delegateTask(
  fromAgent: string,
  toAgent: string,
  title: string,
  description?: string,
  dependencies?: string[],
  root?: string
): ProjectTask {
  return createTask({
    title,
    description,
    assignedTo: toAgent,
    createdBy: fromAgent,
    dependencies: dependencies ?? []
  }, root);
}

export function completeTask(id: string, result: string, root?: string): ProjectTask {
  return updateTask(id, {
    status: 'completed',
    result
  }, root);
}

export function failTask(id: string, error: string, root?: string): ProjectTask {
  return updateTask(id, {
    status: 'failed',
    error
  }, root);
}

export function requestReview(taskId: string, reviewerAgentId: string, root?: string): ProjectTask {
  return updateTask(taskId, {
    reviewStatus: 'pending',
    reviewerId: reviewerAgentId
  }, root);
}

export function clearTasks(root?: string): void {
  saveTasks([], root);
}
