export type AgentCapability =
  | 'read'
  | 'write'
  | 'execute'
  | 'git'
  | 'github'
  | 'network';

export type PermissionMode = 'strict' | 'autonomous';

export interface AgentPermissions {
  capabilities: AgentCapability[];
}

export interface ProjectPermissionsConfig {
  version: 1;
  mode: PermissionMode;
  agentPermissions: Record<string, AgentCapability[]>;
}
