export type AgentRole =
  | 'general'
  | 'researcher'
  | 'architect'
  | 'developer'
  | 'reviewer'
  | 'tester';

export interface AgentRecord {
  id: string;
  name: string;
  provider: string;
  model?: string;
  role?: AgentRole;
  createdAt: string;
}
