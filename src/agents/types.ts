export const agentRoles = ['general', 'architect', 'coder', 'reviewer', 'researcher', 'tester'] as const;
export type AgentRole = typeof agentRoles[number];

export interface AgentRecord {
  id: string;
  name: string;
  provider: string;
  model?: string;
  role?: AgentRole;
  createdAt: string;
}
