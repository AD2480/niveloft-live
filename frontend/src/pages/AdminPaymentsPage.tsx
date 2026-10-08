import { CheckCircle2, IndianRupee, ShieldAlert, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAdminPaymentsQuery, useApprovePaymentMutation, useRejectPaymentMutation } from '@/api/billingEndpoints';
import { errorStatus, getErrorMessage, getFieldErrors } from '@/api/errors';
import type { AdminPayment, PaymentStatus } from '@/api/types';
import { useAppSelector } from '@/app/store';
import { PageContainer } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Field, FormError, Textarea } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { day, periodWord, STATUS_TONE } from '@/features/billing/billingText';
import { formatPaise, planFromServer } from '@/features/public/pricing';
import { formatDateTime } from '@/lib/dates';
import { useDocumentTitle } from '@/lib/hooks';

type Filter = PaymentStatus | 'ALL';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'SUBMITTED', label: 'To check' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

const ADMIN_STATUS: Record<PaymentStatus, string> = {
  AWAITING_PAYMENT: 'Not paid yet',
  SUBMITTED: 'To check',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

/**
 * For the people who run the site: UPI payments to check. A personal UPI ID has no API, so each
 * payment is matched by hand: find the UTR in the bank or UPI app, check the amount, then approve
 * (the customer's plan switches on) or reject with a reason (the customer is told).
 */
export function AdminPaymentsPage() {
  useDocumentTitle('Payments');
  const operator = useAppSelector((s) => s.auth.user?.operator ?? false);
  const [filter, setFilter] = useState<Filter>('SUBMITTED');
  const q = useAdminPaymentsQuery(filter, { skip: !operator, pollingInterval: 60_000 });
  const forbidden = !operator || errorStatus(q.error) === 403;

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description="UPI payments to your UPI ID. Find each UPI reference (UTR) in your bank or UPI app and check the amount, then approve it to switch the customer’s plan on."
        actions={!forbidden && <Segmented<Filter> label="Show" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: f.value === 'SUBMITTED' ? q.data?.waiting : undefined }))} />}
      />
      {forbidden ? (
        <Card className="mt-8">
          <EmptyState
            icon={ShieldAlert}
            title="Only the people who run this site can open this page"
            description="Their accounts are listed in the server’s OPERATOR_EMAILS setting."
            action={
              <Link to="/dashboard" className="inline-flex min-h-6 items-center py-1 text-[13px] font-medium text-accent hover:underline">
                Back to Today
              </Link>
            }
          />
        </Card>
      ) : q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : q.isError || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.payments.length === 0 ? (
        <Card>
          <EmptyState
            icon={IndianRupee}
            title={filter === 'SUBMITTED' ? 'Nothing to check' : 'No payments here yet'}
            description={filter === 'SUBMITTED' ? 'When a customer enters a UPI reference, it appears here and you get an email.' : undefined}
          />
        </Card>
      ) : (
        <ul className="space-y-3" data-admin-payments="">
          {q.data.payments.map((p) => (
            <PaymentCard key={p.payment.id} row={p} />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function PaymentCard({ row }: { row: AdminPayment }) {
  const p = row.payment;
  const amount = formatPaise(p.amountPaise);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [approve, approveState] = useApprovePaymentMutation();
  const [reject, rejectState] = useRejectPaymentMutation();

  const doApprove = async () => {
    try {
      await approve({ id: p.id }).unwrap();
      toast.success(`Approved: ${row.userName} is on ${planFromServer(p.plan).name}.`);
      setApproving(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setApproving(false);
    }
  };

  const doReject = async () => {
    setReasonError(null);
    setFormError(null);
    if (reason.trim().length < 3) {
      setReasonError('Say why, in a few words: the customer sees it.');
      return;
    }
    try {
      await reject({ id: p.id, note: reason.trim() }).unwrap();
      toast.success('Rejected. The customer has been told why.');
      setRejecting(false);
      setReason('');
    } catch (e) {
      const fields = getFieldErrors(e);
      if (fields.note) setReasonError(fields.note);
      else setFormError(getErrorMessage(e));
    }
  };

  return (
    <li>
      <Card data-admin-payment={p.reference}>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{row.userName}</p>
              <p className="truncate text-[13px] text-muted">{row.userEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[p.status]}>{ADMIN_STATUS[p.status]}</Badge>
              <span className="reading text-[22px] text-ink">{amount}</span>
            </div>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Plan">
              {planFromServer(p.plan).name}, {periodWord(p.period)}
            </Item>
            <Item label="UPI reference (UTR)">
              {p.utr ? (
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-ink tabular-nums">{p.utr}</span>
                  <CopyButton text={p.utr} what="the UTR" iconOnly />
                </span>
              ) : (
                '—'
              )}
            </Item>
            <Item label="Order reference">
              <span className="inline-flex items-center gap-1">
                {p.reference}
                <CopyButton text={p.reference} what="the order reference" iconOnly />
              </span>
            </Item>
            <Item label="Paid to">{p.payeeVpa}</Item>
            <Item label={p.submittedAt ? 'Submitted' : 'Started'}>{formatDateTime(p.submittedAt ?? p.createdAt)}</Item>
            <Item label="Their plan now">
              {planFromServer(row.currentPlan).name}
              {row.currentExpiresAt ? ` until ${day(row.currentExpiresAt)}` : ''}
            </Item>
          </dl>
          {p.status === 'APPROVED' && p.periodEnd && (
            <p className="text-[12.5px] text-muted">
              Approved {p.decidedAt ? day(p.decidedAt) : ''}: {day(p.periodStart)} to {day(p.periodEnd)}.{p.decisionNote ? ` Note: ${p.decisionNote}` : ''}
            </p>
          )}
          {p.status === 'REJECTED' && p.decisionNote && <p className="text-[12.5px] text-muted">Reason given: {p.decisionNote}</p>}
          {p.status === 'SUBMITTED' && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button leftIcon={<CheckCircle2 aria-hidden="true" />} onClick={() => setApproving(true)} data-admin-approve={p.reference}>
                Approve
              </Button>
              <Button variant="secondary" leftIcon={<XCircle aria-hidden="true" />} onClick={() => setRejecting(true)} data-admin-reject={p.reference}>
                Reject
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
      <ConfirmDialog
        open={approving}
        onOpenChange={setApproving}
        title={`Approve ${amount} from ${row.userName}?`}
        tone="primary"
        confirmLabel="Yes, I found it"
        loading={approveState.isLoading}
        onConfirm={doApprove}
        description={
          <p>
            Only approve once you’ve found UTR <strong className="text-ink">{p.utr}</strong> for <strong className="text-ink">{amount}</strong> in your bank or UPI app.
            Their {planFromServer(p.plan).name} plan switches on at once and they get a confirmation email.
          </p>
        }
      />
      <Dialog
        open={rejecting}
        onOpenChange={(o) => {
          setRejecting(o);
          if (!o) {
            setReasonError(null);
            setFormError(null);
          }
        }}
        title="Reject this payment?"
        description={`The customer is emailed your reason, and their plan doesn’t change. The UTR ${p.utr ?? ''} can be used again on a new order.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)} disabled={rejectState.isLoading}>
              Keep it
            </Button>
            <Button variant="danger" loading={rejectState.isLoading} onClick={() => void doReject()}>
              Reject payment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormError message={formError} />
          <Field label="Reason (the customer sees this)" error={reasonError ?? undefined} required>
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example: No payment with this UTR has reached us. Please check the number."
              />
            )}
          </Field>
        </div>
      </Dialog>
    </li>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-ink-2">{children}</dd>
    </div>
  );
}
