import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAddCommentMutation, useCommentsQuery, useDeleteCommentMutation, useEditCommentMutation } from '@/api/endpoints';
import { getErrorMessage } from '@/api/errors';
import type { Comment, Role, Task } from '@/api/types';
import { useAppSelector } from '@/app/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Form';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { atLeast, can } from '@/lib/permissions';
import { useTrackedForm } from '@/lib/useTrackedForm';

const MAX = 2000;

function Composer({
  initial = '',
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  autoFocus,
}: {
  initial?: string;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
  submitLabel: string;
  loading: boolean;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState(initial);
  const trimmed = body.trim();
  const submit = async () => {
    if (!trimmed || trimmed.length > MAX) return;
    if (await onSubmit(trimmed)) setBody('');
  };
  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a comment…"
        aria-label="Comment"
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs tabular ${body.length > MAX ? 'text-danger' : 'text-muted'}`}>
          {body.length > MAX ? `${body.length - MAX} characters over the limit` : <span className="hidden sm:inline">⌘/Ctrl + Enter to send</span>}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={() => void submit()} loading={loading} disabled={!trimmed || trimmed.length > MAX}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, task, role }: { comment: Comment; task: Task; role: Role }) {
  const me = useAppSelector((s) => s.auth.user?.id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editComment, editState] = useEditCommentMutation();
  const [deleteComment, deleteState] = useDeleteCommentMutation();
  const mine = comment.author.id === me;
  const canDelete = mine || atLeast(role, 'MANAGER');

  return (
    <li className="flex gap-3">
      <Avatar user={comment.author} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{comment.author.name}</span>
          <time className="text-xs text-muted" dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)}>
            {timeAgo(comment.createdAt)}
          </time>
          {comment.updatedAt && <span className="text-xs text-subtle">(edited)</span>}
          {(mine || canDelete) && !editing && (
            <Menu>
              <MenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Comment actions">
                  <MoreHorizontal />
                </Button>
              </MenuTrigger>
              <MenuContent>
                {mine && (
                  <MenuItem icon={<Pencil />} onSelect={() => setEditing(true)}>
                    Edit
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem icon={<Trash2 />} danger onSelect={() => setConfirming(true)}>
                    Delete
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
          )}
        </div>
        {editing ? (
          <div className="mt-2">
            <Composer
              initial={comment.body}
              submitLabel="Save"
              autoFocus
              loading={editState.isLoading}
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                try {
                  await editComment({ id: comment.id, taskId: task.id, body }).unwrap();
                  setEditing(false);
                  return true;
                } catch (e) {
                  toast.error(getErrorMessage(e));
                  return false;
                }
              }}
            />
          </div>
        ) : (
          <p className="mt-1 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">{comment.body}</p>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete comment?"
        description="This comment will be permanently removed."
        confirmLabel="Delete"
        loading={deleteState.isLoading}
        onConfirm={async () => {
          try {
            await deleteComment({ id: comment.id, taskId: task.id, projectId: task.projectId }).unwrap();
            setConfirming(false);
            toast.success('Comment deleted');
          } catch (e) {
            toast.error(getErrorMessage(e));
          }
        }}
      />
    </li>
  );
}

export function CommentsPanel({ task, role }: { task: Task; role: Role }) {
  const { data, isLoading, isError, error, refetch } = useCommentsQuery(task.id);
  const [addComment, { isLoading: adding }] = useAddCommentMutation();
  const track = useTrackedForm('comment', can.comment(role));

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load comments" />
      ) : data && data.length > 0 ? (
        <ul className="space-y-5">
          {data.map((c) => (
            <CommentItem key={c.id} comment={c} task={task} role={role} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={MessageSquare} title="No comments yet" description="Ask a question or share an update with the team." compact />
      )}

      {can.comment(role) ? (
        <Composer
          submitLabel="Comment"
          loading={adding}
          onSubmit={async (body) => {
            track.submitted();
            try {
              await addComment({ taskId: task.id, projectId: task.projectId, body }).unwrap();
              track.succeeded();
              return true;
            } catch (e) {
              track.failed(e);
              toast.error(getErrorMessage(e));
              return false;
            }
          }}
        />
      ) : (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">Viewers can read comments but not post them.</p>
      )}
    </div>
  );
}
