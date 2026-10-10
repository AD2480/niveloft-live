import { describe, expect, it } from 'vitest';
import type { Task } from '@/api/types';
import { apacheJiraModel, apacheReference, apacheSummary, isApacheReferenceQuestion } from './apacheJira';
const task = { id: 1, key: 'WEB-1', priority: 'HIGH', status: 'TODO', createdAt: '2026-10-01T00:00:00Z' } as Task;
describe('Apache external reference', () => {
  it('does not intercept unrelated Apache tasks', () => {
    expect(isApacheReferenceQuestion('Apache benchmark for my tasks')).toBe(true);
    expect(isApacheReferenceQuestion('Compare with Kaggle')).toBe(true);
    expect(isApacheReferenceQuestion('Create a task to configure Apache')).toBe(false);
    expect(isApacheReferenceQuestion('Will we meet the deadline?')).toBe(false);
  });
  it('has finite ordered ranges for every priority and month', () => {
    for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const) {
      for (let month = 1; month <= 12; month++) {
        const r = apacheReference({ ...task, priority, createdAt: `2026-${String(month).padStart(2, '0')}-01T00:00:00Z` });
        expect(r).not.toBeNull();
        expect(r!.p10).toBeGreaterThanOrEqual(0);
        expect(r!.p50).toBeGreaterThanOrEqual(r!.p10);
        expect(r!.p90).toBeGreaterThanOrEqual(r!.p50);
      }
    }
  });
  it('rejects completed tasks, invalid dates, and unsupported priorities', () => {
    expect(apacheReference({ ...task, status: 'DONE' })).toBeNull();
    expect(apacheReference({ ...task, createdAt: 'not-a-date' })).toBeNull();
    expect(apacheReference({ ...task, priority: 'UNKNOWN' as Task['priority'] })).toBeNull();
  });
  it('uses UTC months consistently', () => {
    expect(apacheReference({ ...task, createdAt: '2026-09-30T22:30:00Z' })).toEqual(apacheReference({ ...task, createdAt: '2026-10-01T04:00:00+05:30' }));
  });
  it('Flurry shares the UI model and limits answers to the requested task', () => {
    const other = { ...task, id: 2, key: 'WEB-2', priority: 'LOW' as const };
    const reply = apacheSummary([task, other], 'Apache benchmark WEB-2');
    expect(reply).toContain('WEB-2:');
    expect(reply).not.toContain('WEB-1:');
    expect(reply).toContain(apacheReference(other)!.p50.toFixed(1));
    expect(reply).toContain('Not remaining time');
    expect(reply).toContain('Unresolved issues were excluded');
    expect(apacheSummary([task], 'Apache WEB-999')).toContain('No matching open task');
  });
  it('records a verifiable source and evaluation counts', () => {
    expect(apacheJiraModel.trainingRows).toBeGreaterThan(1000);
    expect(apacheJiraModel.testRows).toBeGreaterThan(200);
    expect(apacheJiraModel.testEraRows).toBe(apacheJiraModel.testRows + apacheJiraModel.testEraWithoutValidOutcome);
    expect(apacheJiraModel.archiveSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
