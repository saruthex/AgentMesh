import type { OrchestrationResult } from './orchestrator.js';

export function buildCollaborationContext(results: OrchestrationResult[], maxCharacters = 12000): string {
  if (!results.length) return '(No previous agent output.)';

  const sections = results.map(result => `[${result.agent.name} — ${result.agent.role ?? 'general'}]\n${result.content}`);
  let context = sections.join('\n\n');

  if (context.length <= maxCharacters) return context;

  const kept: string[] = [];
  let remaining = maxCharacters;

  for (const section of [...sections].reverse()) {
    if (remaining <= 0) break;
    const slice = section.length > remaining ? section.slice(-remaining) : section;
    kept.unshift(slice);
    remaining -= slice.length + 2;
  }

  return `[Earlier collaboration context trimmed to stay within the context budget.]\n\n${kept.join('\n\n')}`;
}
