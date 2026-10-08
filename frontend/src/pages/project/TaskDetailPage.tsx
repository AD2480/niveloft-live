import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ClipboardCheck,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  useChangeTaskStatusMutation,
  useDeleteTaskMutation,
  useMilestonesQuery,
  useSubmissionsQuery,
  useTaskActivityQuery,
  useTaskQuery,
  useUpdateTaskMutation,
} from '@/api/endpoints';
import { errorStatus, getErrorMessage, isEditConflict } from '@/api/errors';
import type { Task, TaskRequest, TaskStatus } from '@/api/types';
import { DueDate, PriorityIcon, StatusBadge } from '@/components/domain';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CopyButton, copyText } from '@/components/ui/CopyButton';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Form';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/Menu';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { ActivityList } from '@/features/activity/ActivityList';
import { useCurrentUserId, useProjectContext } from '@/features/projects/projectContext';
import { CommentsPanel } from '@/features/tasks/CommentsPanel';
import { CriterionResults, SubmissionHistory } from '@/features/tasks/SubmissionHistory';
import { SubmitWorkDialog } from '@/features/tasks/SubmitWorkDialog';
import { TaskCriteriaCard } from '@/features/tasks/TaskCriteriaCard';
import { TaskDependenciesCard } from '@/features/dependencies/TaskDependenciesCard';
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog';
import { WorkflowStepper } from '@/features/tasks/WorkflowStepper';
import { PRIORITIES, PRIORITY_LABEL, STATUS_LABEL } from '@/lib/constants';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { useDocumentTitle } from '@/lib/hooks';
import { atLeast, can } from '@/lib/permissions';
import { NotFoundPage } from '../NotFoundPage';

function toRequest(t: Task, patch: Partial<TaskRequest>): TaskRequest {
  return {
    title: t.title,
    description: t.description,
    priority: t.priority,
    assigneeId: t.assignee?.id ?? null,
    dueDate: t.dueDate,
    milestoneId: t.milestoneId,
    estimateDays: t.estimateDays,
    // Optimistic locking: the server rejects the save if someone changed the task since we loaded it.
    version: t.version,
    ...patch,
  };
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-3 py-2">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="min-w-0 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

interface TaskDetailViewProps {
  taskId: number;
  /** "page" = full route; "panel" = side panel over the board. */
  variant?: 'page' | 'panel';
  /** Extra header actions (the panel passes "open full page" and "close"). */
  headerExtra?: ReactNode;
  /** Called after the task is deleted (the panel closes itself). */
  onDeleted?: () => void;
}

export function TaskDetailPage() {
  const { taskId } = useParams();
  return <TaskDetailView taskId={Number(taskId)} />;
}

/** Full task view; rendered as a page or inside the board's side panel. */
export function TaskDetailView({ taskId, variant = 'page', headerExtra, onDeleted }: TaskDetailViewProps) {
  const id = taskId;
  const panel = variant === 'panel';
  const { project } = useProjectContext();
  const me = useCurrentUserId();
  const navigate = useNavigate();
  const role = project.myRole;

  const { data: task, isLoading, isError, error, refetch } = useTaskQuery(id, { skip: !Number.isFinite(id) });
  const { data: submissions, isLoading: loadingSubs } = useSubmissionsQuery(id, { skip: !Number.isFinite(id) });
  const { data: activity } = useTaskActivityQuery(id, { skip: !Number.isFinite(id) });
  const { data: milestones } = useMilestonesQuery(project.id);
  const [updateTask, updateState] = useUpdateTaskMutation();
  const [changeStatus, statusState] = useChangeTaskStatusMutation();
  const [deleteTask, deleteState] = useDeleteTaskMutation();

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  useDocumentTitle(task ? `${task.key} ${task.title}` : undefined);

  if (!Number.isFinite(id)) return <NotFoundPage />;
  if (isLoading) {
    return (
      <div className={panel ? 'space-y-4 px-5 py-6' : 'mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-10'}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (isError || !task) {
    if (errorStatus(error) === 404) return <NotFoundPage title="Task not found" description="It may have been deleted." />;
    return <ErrorState error={error} onRetry={refetch} className="min-h-[50vh]" />;
  }
  if (task.projectId !== project.id) {
    return <NotFoundPage title="Task not found in this project" />;
  }

  const tl = { status: task.status, assigneeId: task.assignee?.id ?? null, reporterId: task.reporter.id };
  const canEdit = can.editTask(role, tl, me) && project.status !== 'ARCHIVED';
  const canDelete = can.deleteTask(role, tl, me);
  const pending = submissions?.find((s) => s.status === 'PENDING');
  const lastReview = submissions?.find((s) => s.review)?.review ?? null;
  const canReview = !!pending && can.reviewSubmission(role, pending.submittedBy.id, me);
  const canSubmit = can.submitWork(role, tl, me);
  const busy = updateState.isLoading || statusState.isLoading;

  const patch = async (p: Partial<TaskRequest>, success = 'Task updated') => {
    try {
      await updateTask({ id: task.id, projectId: project.id, body: toRequest(task, p) }).unwrap();
      toast.success(success);
    } catch (e) {
      if (isEditConflict(e)) {
        toast.error('Someone else just changed this task.', {
          description: 'Your change wasn’t saved. Reload to see the latest version, then try again.',
          action: { label: 'Reload', onClick: () => void refetch() },
        });
      } else {
        toast.error(getErrorMessage(e));
      }
    }
  };

  const move = async (status: TaskStatus) => {
    try {
      await changeStatus({ id: task.id, projectId: project.id, status }).unwrap();
      toast.success(task.status === 'DONE' ? `${task.key} reopened` : `Moved to ${STATUS_LABEL[status]}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  // Primary workflow action for the current user.
  let workflow: ReactNode = null;
  if (task.status === 'TODO' && can.changeStatus(role, tl, me, 'IN_PROGRESS')) {
    workflow = (
      <Button leftIcon={<Play />} onClick={() => void move('IN_PROGRESS')} loading={statusState.isLoading}>
        Start work
      </Button>
    );
  }
  if (task.status === 'IN_PROGRESS' && canSubmit) {
    workflow = (
      <Button leftIcon={<Send />} onClick={() => setSubmitting(true)}>
        Submit for review
      </Button>
    );
  }
  if (task.status === 'IN_REVIEW' && canReview) {
    workflow = (
      <Button leftIcon={<ClipboardCheck />} onClick={() => navigate(`/projects/${project.id}/tasks/${task.id}/review`)}>
        Open review
      </Button>
    );
  }
  if (task.status === 'DONE' && atLeast(role, 'MANAGER')) {
    workflow = (
      <Button variant="secondary" leftIcon={<Undo2 />} onClick={() => void move('IN_PROGRESS')} loading={statusState.isLoading}>
        Reopen
      </Button>
    );
  }

  let workflowNote: ReactNode;
  switch (task.status) {
    case 'TODO':
      workflowNote = task.assignee
        ? task.assignee.id === me
          ? 'This is yours: start it when you begin the work.'
          : `Waiting for ${task.assignee.name} (the assignee) to start.${atLeast(role, 'MANAGER') ? ' As a manager you can also start it or reassign it.' : ''}`
        : atLeast(role, 'MANAGER')
          ? 'Not assigned yet: assign it to someone so they can work on it.'
          : 'Not assigned yet. You can take it yourself from Assignee.';
      break;
    case 'IN_PROGRESS':
      workflowNote =
        task.assignee?.id === me
          ? 'Submit your work for review when it’s complete. Someone else (a manager or the owner) will review it.'
          : `${task.assignee?.name ?? 'The assignee'} is working on this. Only the assignee submits it for review${atLeast(role, 'MANAGER') ? '; you can review it once they do' : ''}.`;
      break;
    case 'IN_REVIEW':
      workflowNote = pending
        ? pending.submittedBy.id === me
          ? 'Your submission is waiting for a manager’s review.'
          : canReview
            ? `${pending.submittedBy.name} submitted this for your review.`
            : `Waiting for a manager to review ${pending.submittedBy.name}’s submission.`
        : 'Awaiting review.';
      break;
    case 'DONE':
      workflowNote = task.completedAt ? `Approved and completed ${timeAgo(task.completedAt)}.` : 'Completed.';
      break;
  }

  const changesRequested = task.status === 'IN_PROGRESS' && lastReview?.decision === 'CHANGES_REQUESTED' && submissions?.[0]?.status === 'CHANGES_REQUESTED';

  return (
    <div className={panel ? 'px-5 py-5' : 'mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10'}>
      {!panel && (
        <Link to={`/projects/${project.id}/board`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to board
        </Link>
      )}

      <div className={cn('flex flex-col gap-3', !panel && 'sm:flex-row sm:items-start sm:justify-between')}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-muted">{task.key}</span>
            <CopyButton text={task.key} what={`the task key ${task.key}`} iconOnly className="-my-1 text-muted" />
            <StatusBadge status={task.status} />
            {task.overdue && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                <AlertTriangle className="size-3.5" aria-hidden="true" /> Overdue
              </span>
            )}
          </div>
          <h1 className={cn('mt-1 font-display font-semibold tracking-[-0.03em] break-words text-ink', panel ? 'text-xl' : 'text-2xl sm:text-[28px]')}>{task.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button variant="secondary" leftIcon={<Pencil />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Menu>
            <MenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem
                icon={<LinkIcon />}
                onSelect={() => {
                  void copyText(`${window.location.origin}/projects/${project.id}/tasks/${task.id}`).then((ok) =>
                    ok ? toast.success('Link copied') : toast.error('Couldn’t copy the link. Copy it from the address bar instead.'),
                  );
                }}
              >
                Copy link
              </MenuItem>
              {task.status === 'IN_PROGRESS' && can.changeStatus(role, tl, me, 'TODO') && (
                <MenuItem icon={<Undo2 />} onSelect={() => void move('TODO')}>
                  Move back to To do
                </MenuItem>
              )}
              {canDelete && (
                <>
                  <MenuSeparator />
                  <MenuItem icon={<Trash2 />} danger onSelect={() => setConfirmDelete(true)}>
                    Delete task
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
          {headerExtra}
        </div>
      </div>

      <div className={cn('mt-6 grid gap-6', !panel && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
        <div className="min-w-0 space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <WorkflowStepper status={task.status} />
              <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[13px] text-ink-2">
                  <Clock className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  {workflowNote}
                </p>
                {workflow}
              </div>
              {changesRequested && lastReview && (
                <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3" role="note">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-warning">
                    <RotateCcw className="size-4" aria-hidden="true" /> {lastReview.reviewer.name} requested changes
                  </p>
                  {lastReview.feedback && <p className="mt-1 text-[13px] whitespace-pre-wrap text-ink-2">{lastReview.feedback}</p>}
                  {lastReview.results.some((r) => !r.met) && (
                    <CriterionResults review={{ ...lastReview, results: lastReview.results.filter((r) => !r.met) }} />
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <CardBody>
              {task.description ? (
                <p className="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">{task.description}</p>
              ) : (
                <p className="text-[13px] text-muted">
                  No description.{' '}
                  {canEdit && (
                    <button type="button" className="font-medium text-accent hover:underline" onClick={() => setEditing(true)}>
                      Add one
                    </button>
                  )}
                </p>
              )}
            </CardBody>
          </Card>

          <TaskCriteriaCard task={task} canEdit={canEdit} />

          <TaskDependenciesCard task={task} canEdit={canEdit} />

          <Card>
            <CardHeader
              title="Submissions and reviews"
              description="Every submission and review decision is kept for the record."
              action={
                submissions && submissions.length > 0 ? (
                  <Link to={`/projects/${project.id}/tasks/${task.id}/review`} className="text-[13px] font-medium text-accent hover:underline">
                    Open review workspace
                  </Link>
                ) : null
              }
            />
            <CardBody>
              <SubmissionHistory submissions={submissions} loading={loadingSubs} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={tab === 'comments' ? 'Comments' : 'Activity'}
              action={
                <Segmented
                  label="Show"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'comments', label: 'Comments', count: task.commentCount },
                    { value: 'activity', label: 'History' },
                  ]}
                />
              }
            />
            <CardBody>
              {tab === 'comments' ? (
                <CommentsPanel task={task} role={role} />
              ) : activity && activity.length > 0 ? (
                <ActivityList items={activity} linkTasks={false} compact />
              ) : (
                <p className="text-[13px] text-muted">No history yet.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className={cn('space-y-4', panel ? 'order-first' : 'lg:sticky lg:top-32 lg:self-start')}>
          <Card>
            <CardHeader title="Details" />
            <CardBody className="py-2">
              <dl className="divide-y divide-line">
                <Property label="Status">
                  <StatusBadge status={task.status} />
                </Property>
                <Property label="Assignee">
                  {canEdit && (atLeast(role, 'MANAGER') || !task.assignee || task.assignee.id === me) ? (
                    <Select
                      aria-label="Assignee"
                      value={task.assignee?.id ?? ''}
                      disabled={busy}
                      onChange={(e) => void patch({ assigneeId: e.target.value ? Number(e.target.value) : null }, 'Assignee updated')}
                    >
                      <option value="">Unassigned</option>
                      {project.members
                        .filter((m) => m.role !== 'VIEWER' && (atLeast(role, 'MANAGER') || m.user.id === me || m.user.id === task.assignee?.id))
                        .map((m) => (
                          <option key={m.user.id} value={m.user.id}>
                            {m.user.name}
                            {m.user.id === me ? ' (you)' : ''}
                          </option>
                        ))}
                    </Select>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Avatar user={task.assignee} size="sm" />
                      {task.assignee?.name ?? <span className="text-muted">Unassigned</span>}
                    </span>
                  )}
                </Property>
                <Property label="Priority">
                  {canEdit ? (
                    <Select aria-label="Priority" value={task.priority} disabled={busy} onChange={(e) => void patch({ priority: e.target.value as Task['priority'] }, 'Priority updated')}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABEL[p]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <PriorityIcon priority={task.priority} /> {PRIORITY_LABEL[task.priority]}
                    </span>
                  )}
                </Property>
                <Property label="Due date">
                  {canEdit ? (
                    <Input
                      type="date"
                      aria-label="Due date"
                      defaultValue={task.dueDate ?? ''}
                      key={task.dueDate ?? 'none'}
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== task.dueDate) void patch({ dueDate: v }, v ? 'Due date updated' : 'Due date removed');
                      }}
                      className={task.overdue ? 'border-danger text-danger' : undefined}
                    />
                  ) : (
                    <DueDate date={task.dueDate} done={task.status === 'DONE'} />
                  )}
                </Property>
                <Property label="Estimate">
                  {canEdit ? (
                    <Input
                      type="number"
                      min={1}
                      max={250}
                      aria-label="Estimate in working days"
                      placeholder="Not estimated"
                      defaultValue={task.estimateDays ?? ''}
                      key={`est-${task.estimateDays ?? 'none'}`}
                      disabled={busy}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === '' ? null : Math.round(Number(raw));
                        if (v !== null && (!Number.isFinite(v) || v < 1 || v > 250)) {
                          toast.error('Enter whole working days between 1 and 250, or leave it empty.');
                          e.target.value = task.estimateDays === null ? '' : String(task.estimateDays); // put the saved value back
                          return;
                        }
                        if (v !== task.estimateDays) void patch({ estimateDays: v }, v ? 'Estimate updated' : 'Estimate removed');
                      }}
                    />
                  ) : task.estimateDays ? (
                    `${task.estimateDays} working ${task.estimateDays === 1 ? 'day' : 'days'} (estimate)`
                  ) : (
                    <span className="text-muted">Not estimated</span>
                  )}
                </Property>
                <Property label="Milestone">
                  {canEdit ? (
                    <Select
                      aria-label="Milestone"
                      value={task.milestoneId ?? ''}
                      disabled={busy}
                      onChange={(e) => void patch({ milestoneId: e.target.value ? Number(e.target.value) : null }, 'Milestone updated')}
                    >
                      <option value="">None</option>
                      {(milestones ?? []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    (task.milestoneName ?? <span className="text-muted">None</span>)
                  )}
                </Property>
                <Property label="Reporter">
                  <span className="flex items-center gap-2">
                    <Avatar user={task.reporter} size="sm" />
                    <span className="truncate">{task.reporter.name}</span>
                  </span>
                </Property>
              </dl>
            </CardBody>
          </Card>
          <dl className="space-y-1 px-1 text-xs text-muted">
            <div>
              <dt className="inline">Created </dt>
              <dd className="inline" title={formatDateTime(task.createdAt)}>
                {timeAgo(task.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="inline">Updated </dt>
              <dd className="inline" title={formatDateTime(task.updatedAt)}>
                {timeAgo(task.updatedAt)}
              </dd>
            </div>
            {task.completedAt && (
              <div>
                <dt className="inline">Completed </dt>
                <dd className="inline">{formatDateTime(task.completedAt)}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      <TaskFormDialog open={editing} onOpenChange={setEditing} project={project} task={task} />
      <SubmitWorkDialog task={task} open={submitting} onOpenChange={setSubmitting} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${task.key}?`}
        description={
          <>
            <strong className="font-semibold text-ink">{task.title}</strong> and its comments and submissions will be permanently deleted. Project activity keeps a record that it was deleted.
          </>
        }
        confirmLabel="Delete task"
        loading={deleteState.isLoading}
        onConfirm={async () => {
          try {
            await deleteTask({ id: task.id, projectId: project.id }).unwrap();
            toast.success(`${task.key} deleted`);
            if (onDeleted) onDeleted();
            else navigate(`/projects/${project.id}/board`, { replace: true });
          } catch (e) {
            toast.error(getErrorMessage(e));
          }
        }}
      />
    </div>
  );
}
