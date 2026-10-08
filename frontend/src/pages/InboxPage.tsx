import { BellOff, CalendarClock, CheckCheck, CheckCircle2, Mail, MailOpen, MessageSquare, MoreHorizontal, RotateCcw, Send, Trash2, UserPlus, UserRoundCog, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMyInvitationsQuery,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '@/api/endpoints';
import { getErrorMessage } from '@/api/errors';
import type { Notification, NotificationCategory, NotificationType } from '@/api/types';
import { PageContainer } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { LastUpdated } from '@/components/ui/LastUpdated';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { InvitationRow } from '@/features/projects/InvitationList';
import { cn } from '@/lib/cn';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { useDocumentTitle, useUrlState } from '@/lib/hooks';

const TYPE_ICON: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  TASK_ASSIGNED: { icon: UserPlus, tone: 'bg-info-soft text-info' },
  INVITATION: { icon: Mail, tone: 'bg-brand-soft text-accent' },
  SUBMISSION: { icon: Send, tone: 'bg-warning-soft text-warning' },
  REVIEW_APPROVED: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  CHANGES_REQUESTED: { icon: RotateCcw, tone: 'bg-warning-soft text-warning' },
  COMMENT: { icon: MessageSquare, tone: 'bg-surface-2 text-muted' },
  ROLE_CHANGED: { icon: UserRoundCog, tone: 'bg-info-soft text-info' },
  PLAN_CHANGED: { icon: CalendarClock, tone: 'bg-warning-soft text-warning' },
};

const EMPTY: Record<NotificationCategory, string> = {
  ALL: 'You’ll be notified about assignments, invitations, submissions, reviews and comments.',
  UNREAD: 'You’ve read everything. Nice.',
  ASSIGNMENTS: 'No task assignments yet.',
  INVITATIONS: 'No project invitations.',
  SUBMISSIONS: 'No submissions waiting on you.',
  REVIEWS: 'No review decisions yet.',
};

export function InboxPage() {
  useDocumentTitle('Inbox');
  const navigate = useNavigate();
  const [f, setF] = useUrlState({ category: 'ALL', page: '0' });
  const category = f.category as NotificationCategory;
  const { data, isLoading, isFetching, isError, error, refetch, fulfilledTimeStamp } = useNotificationsQuery({ category, page: Number(f.page), size: 20 });
  const [confirmAll, setConfirmAll] = useState(false);
  const { data: unread = 0 } = useUnreadCountQuery();
  const { data: invitations } = useMyInvitationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();
  const [remove] = useDeleteNotificationMutation();
  const pendingInvites = new Map((invitations ?? []).map((i) => [i.id, i]));

  const markAllNow = () =>
    markAll()
      .unwrap()
      .then(() => {
        setConfirmAll(false);
        toast.success('All notifications marked as read');
      })
      .catch((e) => toast.error(getErrorMessage(e)));

  const open = (n: Notification) => {
    if (!n.read) void markRead({ id: n.id });
    if (n.link && n.type !== 'INVITATION') navigate(n.link);
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Inbox"
        description={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'You’re all caught up.'}
        actions={
          <>
            <LastUpdated at={fulfilledTimeStamp} onRefresh={refetch} refreshing={isFetching} className="mr-2" />
            <Button
              variant="secondary"
              leftIcon={<CheckCheck />}
              disabled={unread === 0}
              loading={markAllState.isLoading}
              // A few are marked at once; more than that asks first, since it can't be undone.
              onClick={() => (unread > 3 ? setConfirmAll(true) : void markAllNow())}
            >
              Mark all as read
            </Button>
          </>
        }
      />

      <div className="scrollbar-thin -mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented
          label="Filter notifications"
          value={category}
          onChange={(c) => setF({ category: c, page: '0' })}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'UNREAD', label: 'Unread', count: unread || undefined },
            { value: 'ASSIGNMENTS', label: 'Assignments' },
            { value: 'INVITATIONS', label: 'Invitations', count: invitations?.length || undefined },
            { value: 'SUBMISSIONS', label: 'Submissions' },
            { value: 'REVIEWS', label: 'Reviews' },
          ]}
        />
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load notifications" />
        ) : data.content.length === 0 ? (
          <EmptyState icon={BellOff} title="No notifications" description={EMPTY[category]} />
        ) : (
          <>
            <ul className={cn('divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-opacity', isFetching && 'opacity-70')}>
              {data.content.map((n) => {
                const { icon: Icon, tone } = TYPE_ICON[n.type];
                const invite = n.invitationId ? pendingInvites.get(n.invitationId) : undefined;
                return (
                  <li key={n.id} className={cn('group relative flex gap-3 px-4 py-3.5 sm:px-5', !n.read && 'bg-brand-soft/30')}>
                    {!n.read && <span className="absolute top-1/2 left-1.5 size-2 -translate-y-1/2 rounded-full bg-brand" aria-label="Unread" />}
                    <div className="relative shrink-0">
                      {n.actor ? <Avatar user={n.actor} size="lg" /> : <span className="block size-10" />}
                      <span className={cn('absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-surface', tone)}>
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => open(n)} className="group block w-full rounded-md text-left">
                        <p className={cn('text-[13px] text-ink transition-colors group-hover:text-accent', !n.read && 'font-semibold')}>{n.title}</p>
                        <p className="mt-0.5 text-[13px] text-ink-2">{n.message}</p>
                        <time className="mt-1 block text-xs text-muted" dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>
                          {timeAgo(n.createdAt)}
                        </time>
                      </button>
                      {invite && (
                        <div className="mt-3 rounded-lg border border-line bg-surface p-3">
                          <InvitationRow invitation={invite} compact />
                        </div>
                      )}
                      {n.type === 'INVITATION' && !invite && <p className="mt-1 text-xs text-muted">This invitation has already been answered or revoked.</p>}
                    </div>
                    <Menu>
                      <MenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Notification actions" className="shrink-0 opacity-70 group-hover:opacity-100">
                          <MoreHorizontal />
                        </Button>
                      </MenuTrigger>
                      <MenuContent>
                        <MenuItem icon={n.read ? <Mail /> : <MailOpen />} onSelect={() => void markRead({ id: n.id, read: !n.read })}>
                          Mark as {n.read ? 'unread' : 'read'}
                        </MenuItem>
                        <MenuItem
                          icon={<Trash2 />}
                          danger
                          onSelect={() =>
                            remove(n.id)
                              .unwrap()
                              .catch((e) => toast.error(getErrorMessage(e)))
                          }
                        >
                          Delete
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPageChange={(p) => setF({ page: String(p) })} noun="notifications" />
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={`Mark all ${unread} as read?`}
        description="They’ll stay in your inbox, but you won’t be able to tell which ones you haven’t opened yet."
        confirmLabel="Mark all as read"
        tone="primary"
        loading={markAllState.isLoading}
        onConfirm={markAllNow}
      />
    </PageContainer>
  );
}
