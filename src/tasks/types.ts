export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'not_required';

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string; // agentId or name
  createdBy: string;   // agentId or 'user'
  dependencies: string[]; // task IDs
  filesOwned?: string[];
  result?: string;
  reviewStatus?: ReviewStatus;
  reviewerId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
