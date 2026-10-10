import type { Task } from '@/api/types';
import model from './data/apacheJiraModel.json';

export const apacheJiraModel = model;
export const APACHE_LIMIT = 'External Apache reference only: total calendar days from creation to resolution, including waiting. Not remaining time, working effort, or a Niveloft deadline forecast. Unresolved issues were excluded; transfer to your team is unvalidated.';

type ReferenceTask = Pick<Task, 'priority' | 'createdAt' | 'status'>;
export function apacheReference(task: ReferenceTask): { p10: number; p50: number; p90: number } | null {
  if (task.status === 'DONE') return null;
  const created = new Date(task.createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  const support = model.support as Record<string, number>;
  if (!Object.hasOwn(support, task.priority) || support[task.priority] < 100) return null;
  const cells = model.cells as Record<string, { p10: number; p50: number; p90: number }>;
  const range = cells[`${task.priority}:${created.getUTCMonth() + 1}`];
  if (!range || ![range.p10, range.p50, range.p90].every(Number.isFinite) || range.p10 < 0 || range.p10 > range.p50 || range.p50 > range.p90) return null;
  return range;
}

export function apacheSummary(tasks: readonly Task[], question = ''): string {
  const mentioned: string[] = question.toUpperCase().match(/\b[A-Z][A-Z0-9]*-\d+\b/g) ?? [];
  const selected = tasks.filter(t => !mentioned.length || mentioned.includes(t.key.toUpperCase()));
  const rows = selected.flatMap(task => {
    const r = apacheReference(task);
    return r ? [`${task.key}: external median ${r.p50.toFixed(1)} days; 10th–90th percentile ${r.p10.toFixed(1)}–${r.p90.toFixed(1)} days.`] : [];
  });
  return [
    `Apache JIRA model trained on ${model.trainingRows.toLocaleString()} resolved tasks.`,
    ...rows.slice(0, 5),
    !rows.length ? 'No matching open task has a supported reference.' : rows.length > 5 ? `Showing 5 of ${rows.length}; see Predictions for the comparison.` : '',
    `Time-separated test MAE: ${model.maeDays.toFixed(1)} days; simple median baseline: ${model.baselineMaeDays.toFixed(1)} days.`,
    model.maeDays < model.baselineMaeDays * 0.95 ? 'Lower error on external resolved issues does not establish accuracy for your team.' : 'The model offers no material improvement over the simple baseline; use it only as an experiment.',
    APACHE_LIMIT,
  ].filter(Boolean).join(' ');
}

/** Explicit benchmark intent only; ordinary tasks mentioning Apache must keep their normal action. */
export function isApacheReferenceQuestion(question: string): boolean {
  return /\b(apache|kaggle|jira)\b/i.test(question) && /\b(benchmark|reference|comparison|compare)\b/i.test(question);
}
