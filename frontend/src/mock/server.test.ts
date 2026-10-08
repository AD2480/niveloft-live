import { beforeEach, describe, expect, it } from 'vitest';
import type { ApiErrorBody, AuthResponse, DashboardData, Dependency, ProjectDetail, SearchResult, Submission, Task } from '@/api/types';
import { DEMO_PASSWORD } from './demoAccounts';
import { createSeedDb } from './seed';
import { handleMockRequest } from './server';
import { setDbForTesting } from './store';

async function call<T>(method: string, url: string, body?: unknown, token?: string) {
  const res = await handleMockRequest({ method, url: `/api${url}`, body, token });
  return { status: res.status, body: res.body as { data: T } & ApiErrorBody };
}

async function login(email: string) {
  const res = await call<AuthResponse>('POST', '/auth/login', { email, password: DEMO_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.data.token;
}

describe('mock API', () => {
  beforeEach(async () => {
    setDbForTesting(await createSeedDb());
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await call('GET', '/projects');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('registers with validation and unique emails', async () => {
    const bad = await call('POST', '/auth/register', { name: 'A', email: 'nope', password: 'short' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.fieldErrors ?? {})).toEqual(['name', 'email', 'password', 'acceptTerms']);

    const dup = await call('POST', '/auth/register', { name: 'Someone', email: 'aarav@projectflow.dev', password: 'Password1', acceptTerms: true });
    expect(dup.status).toBe(409);

    const noTerms = await call('POST', '/auth/register', { name: 'New Student', email: 'new@college.edu', password: 'Password1' });
    expect(noTerms.status).toBe(400);
    expect(Object.keys(noTerms.body.fieldErrors ?? {})).toEqual(['acceptTerms']);
    const bot = await call('POST', '/auth/register', { name: 'New Student', email: 'new@college.edu', password: 'Password1', acceptTerms: true, website: 'http://spam' });
    expect(bot.status).toBe(400);

    const ok = await call<AuthResponse>('POST', '/auth/register', { name: 'New Student', email: 'new@college.edu', password: 'Password1', acceptTerms: true });
    expect(ok.status).toBe(201);
    expect(ok.body.data.user.email).toBe('new@college.edu');
  });

  it('rejects wrong passwords', async () => {
    const res = await call('POST', '/auth/login', { email: 'aarav@projectflow.dev', password: 'wrong-password1' });
    expect(res.status).toBe(401);
  });

  it('runs the full submission and review workflow with permission checks', async () => {
    const owner = await login('aarav@projectflow.dev');
    const member = await login('rohan@projectflow.dev');
    const viewer = await login('vikram@projectflow.dev');

    const project = (await call<ProjectDetail>('POST', '/projects', { name: 'Workflow Test', key: 'WFT', startDate: '2026-09-01', color: '#4f46e5' }, owner)).body.data;
    expect(project.myRole).toBe('OWNER');

    // Owner invites the member; member accepts.
    const inv = await call<{ id: number }>('POST', `/projects/${project.id}/invitations`, { email: 'rohan@projectflow.dev', role: 'MEMBER' }, owner);
    expect(inv.status).toBe(201);
    expect((await call('POST', `/invitations/${inv.body.data.id}/accept`, undefined, member)).status).toBe(200);

    // Viewer is not a member of this project at all.
    expect((await call('GET', `/projects/${project.id}`, undefined, viewer)).status).toBe(403);

    const rohanId = (await call<{ id: number }>('GET', '/auth/me', undefined, member)).body.data.id;
    const task = (
      await call<Task>(
        'POST',
        `/projects/${project.id}/tasks`,
        { title: 'Build login page', priority: 'HIGH', assigneeId: rohanId, acceptanceCriteria: ['Form validates input', 'Errors are announced'], checklist: ['Write tests'] },
        owner,
      )
    ).body.data;
    expect(task.key).toBe('WFT-1');
    expect(task.status).toBe('TODO');
    expect(task.acceptanceCriteria.map((c) => c.text)).toEqual(['Form validates input', 'Errors are announced']);

    // Direct moves to IN_REVIEW / DONE are rejected.
    expect((await call('PATCH', `/tasks/${task.id}/status`, { status: 'DONE' }, owner)).status).toBe(409);

    const started = (await call<Task>('PATCH', `/tasks/${task.id}/status`, { status: 'IN_PROGRESS' }, member)).body.data;
    expect(started.startedAt).not.toBeNull();

    const pr = [{ kind: 'REPOSITORY', label: 'PR', url: 'https://github.com/x/y/pull/1' }];
    // Only the assignee can submit; the checklist must be complete; evidence is required.
    expect((await call('POST', `/tasks/${task.id}/submissions`, { notes: 'Done by owner?', evidence: pr }, owner)).status).toBe(403);
    const blocked = await call('POST', `/tasks/${task.id}/submissions`, { notes: 'Implemented and tested.', evidence: pr }, member);
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain('Write tests');
    expect((await call('PATCH', `/checklist-items/${task.checklist[0].id}`, { done: true }, member)).status).toBe(200);
    expect((await call('POST', `/tasks/${task.id}/submissions`, { notes: 'Implemented and tested.', evidence: [] }, member)).status).toBe(400);

    const sub = await call<Submission>('POST', `/tasks/${task.id}/submissions`, { notes: 'Implemented and tested.', evidence: pr }, member);
    expect(sub.status).toBe(201);
    expect(sub.body.data.criteria).toHaveLength(2);
    expect(sub.body.data.evidence[0].kind).toBe('REPOSITORY');
    expect((await call<Task>('GET', `/tasks/${task.id}`, undefined, owner)).body.data.status).toBe('IN_REVIEW');

    const verdicts = (s: Submission, allMet: boolean) =>
      s.criteria.map((c, i) => ({ submissionCriterionId: c.id, met: allMet || i < s.criteria.length - 1, note: null }));

    // Members cannot review; approval needs every criterion met; changes requested needs feedback.
    expect((await call('POST', `/submissions/${sub.body.data.id}/review`, { decision: 'APPROVED', results: verdicts(sub.body.data, true) }, member)).status).toBe(403);
    expect((await call('POST', `/submissions/${sub.body.data.id}/review`, { decision: 'APPROVED', results: [] }, owner)).status).toBe(400);
    const unmet = await call('POST', `/submissions/${sub.body.data.id}/review`, { decision: 'APPROVED', results: verdicts(sub.body.data, false) }, owner);
    expect(unmet.status).toBe(409);
    expect(unmet.body.code).toBe('WORKFLOW_VIOLATION');
    expect((await call('POST', `/submissions/${sub.body.data.id}/review`, { decision: 'CHANGES_REQUESTED', feedback: '' }, owner)).status).toBe(400);
    const changes = await call<Submission>(
      'POST',
      `/submissions/${sub.body.data.id}/review`,
      { decision: 'CHANGES_REQUESTED', feedback: 'Please announce errors with aria-live.', results: verdicts(sub.body.data, false) },
      owner,
    );
    expect(changes.status).toBe(200);
    expect(changes.body.data.review?.results.filter((r) => !r.met)).toHaveLength(1);
    expect((await call<Task>('GET', `/tasks/${task.id}`, undefined, owner)).body.data.status).toBe('IN_PROGRESS');

    // Resubmit and approve -> DONE, with full history preserved.
    const sub2 = await call<Submission>('POST', `/tasks/${task.id}/submissions`, { notes: 'Added aria-live announcements.', evidence: pr }, member);
    expect(sub2.body.data.version).toBe(2);
    expect((await call('POST', `/submissions/${sub2.body.data.id}/review`, { decision: 'APPROVED', feedback: 'Great', results: verdicts(sub2.body.data, true) }, owner)).status).toBe(200);
    const done = (await call<Task>('GET', `/tasks/${task.id}`, undefined, owner)).body.data;
    expect(done.status).toBe('DONE');
    expect(done.completedAt).not.toBeNull();

    const history = (await call<Submission[]>('GET', `/tasks/${task.id}/submissions`, undefined, member)).body.data;
    expect(history.map((s) => s.status)).toEqual(['APPROVED', 'CHANGES_REQUESTED']);
    expect(history[1].review?.feedback).toContain('aria-live');

    // Progress is derived from records.
    const detail = (await call<ProjectDetail>('GET', `/projects/${project.id}`, undefined, owner)).body.data;
    expect(detail.progress).toBe(100);
    expect(detail.health).toBe('COMPLETED');

    // The member was notified of both review decisions.
    const notes = (await call<{ content: { type: string }[] }>('GET', '/notifications?category=REVIEWS', undefined, member)).body.data.content;
    expect(notes.slice(0, 2).map((n) => n.type)).toEqual(['REVIEW_APPROVED', 'CHANGES_REQUESTED']);
  });

  it('moves a task between neighbours without rewriting other positions', async () => {
    const owner = await login('aarav@projectflow.dev');
    const load = async () => (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=500&sort=position', undefined, owner)).body.data.content;
    const before = await load();
    const moved = before.filter((t) => t.status === 'TODO').at(-1)!;
    const firstInProgress = before.find((t) => t.status === 'IN_PROGRESS')!;

    const res = await call('PATCH', `/tasks/${moved.id}/move`, { status: 'IN_PROGRESS', previousTaskId: null, nextTaskId: firstInProgress.id }, owner);
    expect(res.status).toBe(200);

    const after = await load();
    expect(after.filter((t) => t.status === 'IN_PROGRESS')[0].id).toBe(moved.id);
    // Fractional ordering: every other task keeps its position.
    for (const t of after.filter((x) => x.id !== moved.id)) {
      expect(t.position).toBe(before.find((b) => b.id === t.id)!.position);
    }
  });

  it('rejects neighbours from another column and returns machine-readable codes', async () => {
    const owner = await login('aarav@projectflow.dev');
    const tasks = (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=500', undefined, owner)).body.data.content;
    const todo = tasks.find((t) => t.status === 'TODO')!;
    const done = tasks.find((t) => t.status === 'DONE')!;
    const bad = await call('PATCH', `/tasks/${todo.id}/move`, { status: 'IN_PROGRESS', previousTaskId: done.id, nextTaskId: null }, owner);
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('VALIDATION_FAILED');

    const workflow = await call('PATCH', `/tasks/${todo.id}/status`, { status: 'DONE' }, owner);
    expect(workflow.status).toBe(409);
    expect(workflow.body.code).toBe('WORKFLOW_VIOLATION');
  });

  it('rejects stale edits with EDIT_CONFLICT instead of overwriting', async () => {
    const owner = await login('aarav@projectflow.dev');
    const task = (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=1', undefined, owner)).body.data.content[0];
    const body = { title: task.title, description: task.description, priority: task.priority, assigneeId: task.assignee?.id ?? null, dueDate: task.dueDate, milestoneId: task.milestoneId, estimateDays: task.estimateDays };
    expect((await call('PUT', `/tasks/${task.id}`, { ...body, title: 'First save wins', version: task.version }, owner)).status).toBe(200);
    const stale = await call('PUT', `/tasks/${task.id}`, { ...body, title: 'Second save', version: task.version }, owner);
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('EDIT_CONFLICT');
  });

  it('seeds review revisions with criterion verdicts', async () => {
    const owner = await login('aarav@projectflow.dev');
    const tasks = (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=500', undefined, owner)).body.data.content;
    const ccp5 = tasks.find((t) => t.key === 'CCP-5')!;
    const history = (await call<Submission[]>('GET', `/tasks/${ccp5.id}/submissions`, undefined, owner)).body.data;
    expect(history.length).toBeGreaterThanOrEqual(2);
    const first = history.at(-1)!;
    expect(first.status).toBe('CHANGES_REQUESTED');
    if (first.criteria.length > 0) expect(first.review?.results.some((r) => !r.met)).toBe(true);
  });

  it('explains attention items with the records behind them', async () => {
    const priya = await login('priya@projectflow.dev');
    const dash = (await call<DashboardData>('GET', '/dashboard', undefined, priya)).body.data;
    const review = dash.attention.find((a) => a.kind === 'REVIEW_WAITING');
    expect(review).toBeDefined();
    expect(review!.reason).toMatch(/submitted version \d/);
    expect(review!.refs.length).toBeGreaterThan(0);
    expect(review!.link).toMatch(/\/review$/);
    // Items are ordered HIGH → MEDIUM → LOW.
    const ranks = dash.attention.map((a) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[a.severity]);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it('searches only projects the caller belongs to', async () => {
    const aarav = await login('aarav@projectflow.dev');
    const hit = (await call<SearchResult>('GET', '/search?q=CCP-1', undefined, aarav)).body.data;
    expect(hit.tasks[0].key).toBe('CCP-1');
    const fresh = await call<AuthResponse>('POST', '/auth/register', { name: 'Outside Person', email: 'outside@college.edu', password: 'Password1', acceptTerms: true });
    const none = (await call<SearchResult>('GET', '/search?q=CCP', undefined, fresh.body.data.token)).body.data;
    expect(none.tasks).toHaveLength(0);
    expect(none.projects).toHaveLength(0);
  });

  it('manages dependencies: no loops, same project only, explained on Mission Control', async () => {
    const owner = await login('aarav@projectflow.dev');
    const tasks = (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=500', undefined, owner)).body.data.content;
    const byKey = (k: string) => tasks.find((t) => t.key === k)!;
    const seeded = (await call<Dependency[]>('GET', '/projects/1/dependencies', undefined, owner)).body.data;
    expect(seeded.length).toBeGreaterThan(5);

    // CCP-12 → CCP-15 → CCP-16 exists, so CCP-16 → CCP-12 would close a loop.
    const loop = await call('POST', `/tasks/${byKey('CCP-12').id}/dependencies`, { blockerTaskId: byKey('CCP-16').id }, owner);
    expect(loop.status).toBe(400);
    expect(loop.body.fieldErrors?.blockerTaskId).toMatch(/loop: CCP-12 → CCP-15 → CCP-16 → CCP-12/);
    expect((await call('POST', `/tasks/${byKey('CCP-11').id}/dependencies`, { blockerTaskId: byKey('CCP-11').id }, owner)).status).toBe(400);

    const other = (await call<{ content: Task[] }>('GET', '/projects/2/tasks?size=1', undefined, owner)).body.data.content[0];
    if (other) expect((await call('POST', `/tasks/${byKey('CCP-11').id}/dependencies`, { blockerTaskId: other.id }, owner)).status).toBe(400);

    const added = await call<Dependency>('POST', `/tasks/${byKey('CCP-11').id}/dependencies`, { blockerTaskId: byKey('CCP-10').id }, owner);
    expect(added.status).toBe(201);
    expect((await call('POST', `/tasks/${byKey('CCP-11').id}/dependencies`, { blockerTaskId: byKey('CCP-10').id }, owner)).status).toBe(409);

    // CCP-10 is overdue and now holds up three tasks.
    const dash = (await call<DashboardData>('GET', '/dashboard', undefined, owner)).body.data;
    const blocking = dash.attention.find((a) => a.kind === 'BLOCKING' && a.refs[0] === 'CCP-10');
    expect(blocking?.reason).toMatch(/blocks CCP-12, CCP-14, CCP-11|blocks CCP-11, CCP-12, CCP-14|blocks .*CCP-11/);

    expect((await call('DELETE', `/dependencies/${added.body.data.id}`, undefined, owner)).status).toBe(200);
  });

  it('applies a plan atomically and rejects a stale one', async () => {
    const aarav = await login('aarav@projectflow.dev');
    const rohan = await login('rohan@projectflow.dev');
    const tasks = (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=500', undefined, aarav)).body.data.content.filter((t) => t.status !== 'DONE');
    const deps = (await call<{ id: number }[]>('GET', '/projects/1/dependencies', undefined, aarav)).body.data;
    const basis = { tasks: tasks.map((t) => ({ taskId: t.id, version: t.version })), dependencyIds: deps.map((d) => d.id) };
    const [a, b] = tasks;
    const plan = { basis, changes: [{ taskId: a.id, version: a.version, dueDate: '2030-01-15', estimateDays: 4 }, { taskId: b.id, version: b.version + 1, dueDate: '2030-01-16' }] };
    // A basis missing a dependency is stale even if every changed task is current.
    const depStale = await call('POST', '/projects/1/plan/apply', { ...plan, basis: { ...basis, dependencyIds: deps.slice(1).map((d) => d.id) }, changes: [plan.changes[0]] }, aarav);
    expect(depStale.status).toBe(409);
    expect(depStale.body.message).toContain('dependencies');
    expect((await call('POST', '/projects/1/plan/apply', plan, rohan)).status).toBe(403);
    const stale = await call('POST', '/projects/1/plan/apply', plan, aarav);
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('EDIT_CONFLICT');
    expect((await call<Task>('GET', `/tasks/${a.id}`, undefined, aarav)).body.data.dueDate).toBe(a.dueDate);
    plan.changes[1].version = b.version;
    const ok = await call<{ changedTasks: number }>('POST', '/projects/1/plan/apply', plan, aarav);
    expect(ok.status).toBe(200);
    expect(ok.body.data.changedTasks).toBe(2);
    const after = (await call<Task>('GET', `/tasks/${a.id}`, undefined, aarav)).body.data;
    expect(after.dueDate).toBe('2030-01-15');
    expect(after.estimateDays).toBe(4);
  });

  it('reports AI as unavailable in demo mode instead of inventing answers', async () => {
    const aarav = await login('aarav@projectflow.dev');
    const status = await call<{ available: boolean; reason: string }>('GET', '/ai/status', undefined, aarav);
    expect(status.body.data.available).toBe(false);
    expect(status.body.data.reason).toMatch(/no server AI/);
    const res = await call('POST', '/projects/1/ai/summary', undefined, aarav);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_UNAVAILABLE');
    expect((await call('POST', '/projects/999/ai/summary', undefined, aarav)).status).toBe(404);
  });

  it('records structured before/after values for field changes', async () => {
    const owner = await login('aarav@projectflow.dev');
    const task = (await call<{ content: Task[] }>('GET', '/projects/1/tasks?size=1', undefined, owner)).body.data.content[0];
    await call('PUT', `/tasks/${task.id}`, { title: task.title, description: task.description, priority: 'URGENT', assigneeId: task.assignee?.id ?? null, dueDate: task.dueDate, milestoneId: task.milestoneId, estimateDays: task.estimateDays }, owner);
    const activity = (await call<{ field: string | null; oldValue: string | null; newValue: string | null }[]>('GET', `/tasks/${task.id}/activity`, undefined, owner)).body.data;
    expect(activity[0]).toMatchObject({ field: 'priority', newValue: 'Urgent' });
  });

  it('serves the status history that the 3D model replays, to members only', async () => {
    const aarav = await login('aarav@projectflow.dev');
    const history = (await call<{ taskId: number; from: string | null; to: string; at: string }[]>('GET', '/projects/1/history', undefined, aarav)).body.data;
    expect(history.length).toBeGreaterThan(0);
    const sorted = [...history].sort((a, b) => a.at.localeCompare(b.at));
    expect(history.map((h) => h.at)).toEqual(sorted.map((h) => h.at));
    // Vikram (a viewer on other projects) isn't a member of every project.
    const vikram = await login('vikram@projectflow.dev');
    const projects = (await call<{ content: { id: number }[] }>('GET', '/projects?size=50', undefined, vikram)).body.data.content.map((p) => p.id);
    const outsiderProject = [1, 2, 3, 4, 5].find((id) => !projects.includes(id));
    if (outsiderProject) expect((await call('GET', `/projects/${outsiderProject}/history`, undefined, vikram)).status).toBe(403);
  });
});

describe('mock API: contact, form counts, site health and the arena', () => {
  beforeEach(async () => {
    setDbForTesting(await createSeedDb());
  });

  const message = { name: 'Asha Rao', email: 'asha@example.org', topic: 'QUESTION', message: 'How do I invite my whole class at once?' };

  it('saves a contact message once, even when it is sent twice', async () => {
    const bad = await call('POST', '/contact', { name: 'A', email: 'x', topic: 'NOPE', message: 'short' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.fieldErrors ?? {}).sort()).toEqual(['email', 'message', 'name', 'topic']);
    const bot = await call('POST', '/contact', { ...message, website: 'http://spam.example' });
    expect(bot.status).toBe(400);

    const first = await call<{ id: number; delivered: boolean }>('POST', '/contact', { ...message, attribution: { source: 'newsletter' } });
    expect(first.status).toBe(201);
    const again = await call<{ id: number }>('POST', '/contact', message);
    expect(again.body.data.id).toBe(first.body.data.id);

    const owner = await login('aarav@projectflow.dev');
    const health = await call<SiteHealthBody>('GET', '/site-health?days=30', undefined, owner);
    expect(health.body.data.contact.total).toBe(1);
    expect(health.body.data.contact.recent[0].source).toBe('newsletter');
  });

  it('counts known forms and events only, and shows them to operators only', async () => {
    const res = await call('POST', '/metrics/forms', {
      events: [
        { form: 'sign-up', event: 'view', count: 3 },
        { form: 'sign-up', event: 'submit', count: 2 },
        { form: 'sign-up', event: 'success', count: 1 },
        { form: 'sign-up', event: 'rejected', count: 1 },
        { form: 'made-up', event: 'view', count: 9 },
        { form: 'contact', event: 'hacked', count: 9 },
      ],
    });
    expect(res.status).toBe(204);

    const member = await login('rohan@projectflow.dev');
    expect((await call('GET', '/site-health', undefined, member)).status).toBe(403);

    const owner = await login('aarav@projectflow.dev');
    const me = await call<{ operator: boolean }>('GET', '/auth/me', undefined, owner);
    expect(me.body.data.operator).toBe(true);
    const health = await call<SiteHealthBody>('GET', '/site-health?days=7', undefined, owner);
    expect(health.body.data.forms).toEqual([{ form: 'sign-up', views: 3, submits: 2, successes: 1, invalid: 0, rejected: 1, failed: 0 }]);
  });

  it('records where new accounts came from', async () => {
    await call('POST', '/auth/register', {
      name: 'Campaign Person',
      email: 'campaign@college.edu',
      password: 'Password1',
      acceptTerms: true,
      attribution: { source: 'newsletter', medium: 'email', campaign: 'launch' },
    });
    const owner = await login('aarav@projectflow.dev');
    const health = await call<SiteHealthBody>('GET', '/site-health', undefined, owner);
    expect(health.body.data.signups.sources).toEqual([{ source: 'newsletter', medium: 'email', campaign: 'launch', count: 1 }]);
  });

  it('lets operators mark messages answered', async () => {
    const sent = await call<{ id: number }>('POST', '/contact', message);
    const owner = await login('aarav@projectflow.dev');
    const done = await call<{ handled: boolean }>('PATCH', `/site-health/contact/${sent.body.data.id}`, { handled: true }, owner);
    expect(done.body.data.handled).toBe(true);
    const member = await login('rohan@projectflow.dev');
    expect((await call('PATCH', `/site-health/contact/${sent.body.data.id}`, { handled: false }, member)).status).toBe(403);
  });

  it('counts arena votes for members only, and ranks the sources', async () => {
    const rohan = await login('rohan@projectflow.dev');
    const projects = await call<{ content: { id: number }[] }>('GET', '/projects', undefined, rohan);
    const projectId = projects.body.data.content[0].id;
    const same = await call('POST', '/arena/votes', { projectId, a: 'builtin', b: 'builtin', winner: 'A' }, rohan);
    expect(same.status).toBe(400);
    const unknown = await call('POST', '/arena/votes', { projectId, a: 'builtin', b: 'gpt-9', winner: 'A' }, rohan);
    expect(unknown.status).toBe(400);
    await call('POST', '/arena/votes', { projectId, a: 'builtin', b: 'chrome', winner: 'B' }, rohan);
    const board = await call<{ totalVotes: number; myVotes: number; standings: { contender: string; wins: number; losses: number }[] }>(
      'POST',
      '/arena/votes',
      { projectId, a: 'chrome', b: 'builtin', winner: 'A' },
      rohan,
    );
    expect(board.status).toBe(201);
    expect(board.body.data.totalVotes).toBe(2);
    expect(board.body.data.standings[0]).toMatchObject({ contender: 'chrome', wins: 2, losses: 0 });

    const outsider = await call<{ token: string }>('POST', '/auth/register', { name: 'Outsider Person', email: 'out@college.edu', password: 'Password1', acceptTerms: true });
    const denied = await call('POST', '/arena/votes', { projectId, a: 'builtin', b: 'chrome', winner: 'A' }, outsider.body.data.token);
    expect(denied.status).toBe(403);
  });
});

interface SiteHealthBody {
  forms: unknown[];
  signups: { sources: unknown[] };
  contact: { total: number; recent: { source: string | null }[] };
}
