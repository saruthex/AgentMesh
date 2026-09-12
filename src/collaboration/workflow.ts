import type { AgentRecord, AgentRole } from '../agents/types.js';

export interface WorkflowStep {
  role: AgentRole;
  objective: string;
}

function hasRole(agents: AgentRecord[], role: AgentRole): boolean {
  return agents.some(agent => (agent.role ?? 'general') === role);
}

export function planWorkflow(task: string, agents: AgentRecord[]): WorkflowStep[] {
  const text = task.toLowerCase();
  const steps: WorkflowStep[] = [];

  const wantsResearch = /research|investigate|compare|find|study|analyze/.test(text);
  const wantsArchitecture = /architect|design|structure|system|architecture/.test(text);
  const wantsBuild = /build|implement|code|develop|fix|create/.test(text);
  const wantsReview = /review|improve|quality|audit/.test(text);
  const wantsTesting = /test|bug|verify|validate/.test(text);

  if (wantsResearch && hasRole(agents, 'researcher')) steps.push({ role: 'researcher', objective: 'Research the problem and identify useful facts, constraints, and options.' });
  if (wantsArchitecture && hasRole(agents, 'architect')) steps.push({ role: 'architect', objective: 'Design the architecture and propose a clear technical approach.' });
  if (wantsBuild && hasRole(agents, 'developer')) steps.push({ role: 'developer', objective: 'Turn the agreed approach into an implementation plan or concrete solution.' });
  if (wantsReview && hasRole(agents, 'reviewer')) steps.push({ role: 'reviewer', objective: 'Review the proposed work, identify weaknesses, and recommend improvements.' });
  if (wantsTesting && hasRole(agents, 'tester')) steps.push({ role: 'tester', objective: 'Define validation steps, edge cases, and likely failure modes.' });

  if (!steps.length) {
    const preferred = ['researcher', 'architect', 'developer', 'reviewer', 'tester'] as AgentRole[];
    for (const role of preferred) {
      if (hasRole(agents, role)) steps.push({ role, objective: `Contribute to the task from the ${role} perspective.` });
    }
  }

  if (!steps.length) steps.push({ role: 'general', objective: 'Analyze the task and contribute a useful next step.' });
  return steps;
}

export function workflowSummary(task: string, agents: AgentRecord[]): string[] {
  return planWorkflow(task, agents).map((step, index) => `${index + 1}. ${step.role} — ${step.objective}`);
}
