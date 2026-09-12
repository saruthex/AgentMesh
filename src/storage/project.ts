import fs from 'node:fs';
import path from 'node:path';
import type { AgentRecord } from '../agents/types.js';

export interface ProjectConfig {
  version: number;
  name: string;
  createdAt: string;
  activeAgent: string | null;
  agents: AgentRecord[];
}

const DIR = '.agentmesh';
const CONFIG = 'project.json';

export function initProject(name?: string): string {
  const cwd = process.cwd();
  const root = name ? path.resolve(cwd, name) : cwd;
  const meshDir = path.join(root, DIR);
  const configPath = path.join(meshDir, CONFIG);
  if (fs.existsSync(configPath)) throw new Error(`AgentMesh project already exists at ${root}`);

  fs.mkdirSync(path.join(meshDir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(meshDir, 'memory'), { recursive: true });

  const config: ProjectConfig = {
    version: 1,
    name: name ?? path.basename(root),
    createdAt: new Date().toISOString(),
    activeAgent: null,
    agents: []
  };

  writeProjectConfig(root, config);
  fs.writeFileSync(path.join(meshDir, 'README.md'), '# AgentMesh project data\n');
  return root;
}

export function findProjectRoot(start: string): string | null {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, DIR, CONFIG))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function readProjectConfig(root: string): ProjectConfig {
  return JSON.parse(fs.readFileSync(path.join(root, DIR, CONFIG), 'utf8')) as ProjectConfig;
}

export function writeProjectConfig(root: string, config: ProjectConfig): void {
  fs.writeFileSync(path.join(root, DIR, CONFIG), JSON.stringify(config, null, 2) + '\n');
}
