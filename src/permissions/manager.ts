import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../storage/project.js';
import type { AgentCapability, PermissionMode, ProjectPermissionsConfig } from './types.js';

const PERMISSIONS_FILE = 'permissions.json';
const DIR = '.agentmesh';

export const ALL_CAPABILITIES: AgentCapability[] = ['read', 'write', 'execute', 'git', 'github', 'network'];

export function defaultCapabilitiesForRole(role?: string): AgentCapability[] {
  switch (role) {
    case 'architect':
      return ['read', 'write'];
    case 'developer':
    case 'devops':
    case 'debugger':
    case 'general':
    case undefined:
      return ['read', 'write', 'execute', 'git', 'github'];
    case 'reviewer':
      return ['read', 'git'];
    case 'tester':
      return ['read', 'execute'];
    case 'security':
      return ['read', 'git'];
    case 'documentation':
      return ['read', 'write'];
    default:
      return ['read', 'write'];
  }
}

function getPermissionsPath(root?: string): string {
  const projectRoot = root ?? findProjectRoot(process.cwd());
  if (!projectRoot) throw new Error('No AgentMesh project found. Run `agentmesh init` first.');
  return path.join(projectRoot, DIR, PERMISSIONS_FILE);
}

export function loadPermissionsConfig(root?: string): ProjectPermissionsConfig {
  try {
    const file = getPermissionsPath(root);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as ProjectPermissionsConfig;
    }
  } catch {}

  return {
    version: 1,
    mode: 'strict',
    agentPermissions: {}
  };
}

export function savePermissionsConfig(config: ProjectPermissionsConfig, root?: string): void {
  const file = getPermissionsPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function getPermissionMode(root?: string): PermissionMode {
  return loadPermissionsConfig(root).mode;
}

export function setPermissionMode(mode: PermissionMode, root?: string): void {
  const config = loadPermissionsConfig(root);
  config.mode = mode;
  savePermissionsConfig(config, root);
}

export function getAgentPermissions(agentId: string, role?: string, root?: string): AgentCapability[] {
  const config = loadPermissionsConfig(root);
  const custom = config.agentPermissions[agentId];
  if (custom && Array.isArray(custom)) {
    return custom;
  }
  return defaultCapabilitiesForRole(role);
}

export function setAgentPermissions(agentId: string, capabilities: AgentCapability[], root?: string): void {
  const config = loadPermissionsConfig(root);
  config.agentPermissions[agentId] = capabilities;
  savePermissionsConfig(config, root);
}

export function checkPermission(agentId: string, capability: AgentCapability, role?: string, root?: string): boolean {
  const config = loadPermissionsConfig(root);
  // In autonomous mode, all capabilities are permitted
  if (config.mode === 'autonomous') {
    return true;
  }
  const permissions = getAgentPermissions(agentId, role, root);
  return permissions.includes(capability);
}

export function requirePermission(agentId: string, capability: AgentCapability, operation: string, role?: string, root?: string): void {
  if (!checkPermission(agentId, capability, role, root)) {
    throw new Error(`Permission denied: Agent "${agentId}" lacks required capability "${capability}" for operation "${operation}".`);
  }
}
