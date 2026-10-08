import { CheckCircle2, Clock, ExternalLink, QrCode, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useBillingQuery, useCancelPaymentMutation, useStartPaymentMutation, useSubmitUtrMutation } from '@/api/billingEndpoints';
import { getErrorMessage, getFieldErrors } from '@/api/errors';
import type { BillingSummary, Payment } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/buttonStyles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { Field, FormError, Input } from '@/components/ui/Form';
import { ProgressBar } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { openContact } from '@/features/contact/contactStore';
import { formatPaise, formatRupees, monthsFree, planById, planFromServer, PLANS, serverPeriod, serverPlan, toPeriod, type Period, type Plan } from '@/features/public/pricing';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/hooks';
import { cleanUtr, day, periodWord, STATUS_TONE, STATUS_WORD, utrProblem } from './billingText';
import { UpiQr } from './UpiQr';

/**
 * Settings → Plan and billing: the plan you're on and how much of it you use, then paying for Pro
 * or Team by UPI (QR code or UPI app link, then the UTR), the payment being checked, and history.
 *
 * Arriving from the pricing page (?plan=pro&period=year) starts that payment straight away.
 */
export function BillingSection() {
  const q = useBillingQuery();
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>(() => toPeriod(params.get('period')));
  const [start, starting] = useStartPaymentMutation();
  const [startError, setStartError] = useState<string | null>(null);
  const autoStarted = useRef(false);
  const data = q.data;
  const open = data?.payments.find((p) => p.status === 'AWAITING_PAYMENT') ?? null;
  const waiting = data?.payments.find((p) => p.status === 'SUBMITTED') ?? null;

  const begin = async (plan: Plan, per: Period) => {
    const sp = serverPlan(plan.id);
    if (!sp) return;
    setStartError(null);
    try {
      await start({ plan: sp, period: serverPeriod(per) }).unwrap();
      requestAnimationFrame(() => document.getElementById('upi-pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      setStartError(getErrorMessage(e));
    }
  };

  // From the pricing page: start the chosen payment once, then tidy the address.
  useEffect(() => {
    if (!data || autoStarted.current) return;
    const wanted = planById(params.get('plan'));
    if (!wanted) return;
    autoStarted.current = true;
    const per = toPeriod(params.get('period'));
    const next = new URLSearchParams(params);
    next.delete('plan');
    next.delete('period');
    setParams(next, { replace: true });
    if (wanted.monthly === 0 || waiting || !data.payable) return;
    const sp = serverPlan(wanted.id);
    if (open && open.plan === sp && open.period === serverPeriod(per)) return;
    void begin(wanted, per);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the summary first arrives
  }, [data]);

  if (q.isLoading) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-24 w-full" />
        </CardBody>
      </Card>
    );
  }
  if (q.isError || !data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="We couldn’t load your plan" />;

  return (
    <div className="space-y-6" data-billing="">
      <CurrentPlan data={data} />
      {waiting && <WaitingPayment payment={waiting} />}
      {open && <UpiPayPanel payment={open} />}
      {!waiting && (
        <ChoosePlan
          data={data}
          period={period}
          onPeriod={setPeriod}
          busy={starting.isLoading}
          error={startError}
          onChoose={(plan) => void begin(plan, period)}
          openPayment={open}
        />
      )}
      <PaymentHistory payments={data.payments} />
    </div>
  );
}

function CurrentPlan({ data }: { data: BillingSummary }) {
  const plan = planFromServer(data.plan);
  const paid = data.plan !== 'FREE';
  const ended = !paid && data.paidPlan !== 'FREE' && data.expiresAt;
  const projectsPct = data.maxActiveProjects > 0 ? Math.round((data.activeProjects / data.maxActiveProjects) * 100) : 0;
  return (
    <Card data-billing-current={data.plan}>
      <CardHeader
        title="Your plan"
        action={paid ? <Badge tone="success">Active until {day(data.expiresAt)}</Badge> : <Badge tone="neutral">Free</Badge>}
      />
      <CardBody className="space-y-4 text-[13.5px] text-ink-2">
        <p>
          <span className="text-[20px] font-semibold text-ink">{plan.name}</span>
          {ended && (
            <span className="ml-2 text-muted">
              (your {planFromServer(data.paidPlan).name} plan ended on {day(data.expiresAt)})
            </span>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-4">
            <p className="text-[12.5px] text-muted">Active projects</p>
            {data.maxActiveProjects > 0 ? (
              <>
                <p className="mt-1 font-medium text-ink">
                  {data.activeProjects} of {data.maxActiveProjects}
                </p>
                <ProgressBar value={projectsPct} className="mt-2" label="Active projects used" color={projectsPct >= 100 ? 'var(--danger)' : undefined} />
              </>
            ) : (
              <p className="mt-1 font-medium text-ink">{data.activeProjects}, no limit</p>
            )}
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="text-[12.5px] text-muted">People per project</p>
            <p className="mt-1 font-medium text-ink">Up to {data.maxPeoplePerProject}</p>
            <p className="mt-1 text-[12.5px] text-muted">Viewers (your clients) are free and don’t count.</p>
          </div>
        </div>
        {paid && <p className="text-[12.5px] text-muted">Plans don’t renew by themselves. We’ll email you a week before {day(data.expiresAt)}; you can pay again here any time.</p>}
      </CardBody>
    </Card>
  );
}

function WaitingPayment({ payment }: { payment: Payment }) {
  return (
    <Card className="border-warning/40" data-billing-waiting="">
      <CardBody className="flex gap-3 text-[13.5px] text-ink-2">
        <Clock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-ink">We’re checking your payment</p>
          <p>
            {formatPaise(payment.amountPaise)} for {planFromServer(payment.plan).name} ({periodWord(payment.period)}), order {payment.reference}, UPI reference {payment.utr}.
          </p>
          <p className="text-muted">We usually confirm within a few hours, and always within one working day. You’ll get an email, and your plan switches on by itself.</p>
        </div>
      </CardBody>
    </Card>
  );
}

function ChoosePlan({
  data,
  period,
  onPeriod,
  busy,
  error,
  onChoose,
  openPayment,
}: {
  data: BillingSummary;
  period: Period;
  onPeriod: (p: Period) => void;
  busy: boolean;
  error: string | null;
  onChoose: (plan: Plan) => void;
  openPayment: Payment | null;
}) {
  const free = monthsFree();
  const paidPlans = PLANS.filter((p) => p.monthly > 0);
  return (
    <Card>
      <CardHeader
        title={data.plan === 'FREE' ? 'Upgrade' : 'Renew or change plan'}
        description={openPayment ? 'Choosing another plan or period replaces the payment above.' : 'Pay by UPI from any UPI app. Prices are per workspace, not per person.'}
      />
      <CardBody className="space-y-5">
        <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full border border-line bg-surface p-1">
          {(['year', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => onPeriod(p)}
              className={cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors', period === p ? 'bg-brand text-white dark:text-canvas' : 'text-ink-2 hover:text-ink')}
            >
              {p === 'year' ? 'Yearly' : 'Monthly'}
              {p === 'year' && free > 0 && <span className={cn('ml-1.5 text-[12px]', period === p ? 'opacity-85' : 'text-success')}>{free} months free</span>}
            </button>
          ))}
        </div>
        {!data.payable ? (
          <p className="rounded-md border border-line bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
            Online payment isn’t available right now.{' '}
            <button type="button" className="font-medium text-accent hover:underline" onClick={() => openContact({ topic: 'QUESTION', message: 'I’d like to upgrade my plan.' })}>
              Contact us
            </button>{' '}
            and we’ll set it up for you.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {paidPlans.map((plan) => {
              const price = period === 'year' ? plan.yearly : plan.monthly;
              const current = data.plan === serverPlan(plan.id);
              const chosen = openPayment?.plan === serverPlan(plan.id) && openPayment.period === serverPeriod(period);
              return (
                <li key={plan.id} className={cn('flex flex-col rounded-xl border p-5', plan.highlighted ? 'border-brand/50' : 'border-line')} data-billing-plan={plan.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[16px] font-semibold text-ink">{plan.name}</h3>
                    {current && <Badge tone="success">Your plan</Badge>}
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{plan.tagline}</p>
                  <p className="mt-3">
                    <span className="reading text-[28px] text-ink">{formatRupees(price)}</span>
                    <span className="ml-1.5 text-[13px] text-muted">{period === 'year' ? 'per year' : 'per month'}</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-[13px] text-ink-2">
                    <li>Unlimited active projects</li>
                    <li>Up to {plan.maxPeople} people per project</li>
                    <li>Unlimited client viewers, free</li>
                  </ul>
                  <Button
                    className="mt-4"
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    loading={busy}
                    disabled={chosen}
                    onClick={() => onChoose(plan)}
                    data-billing-choose={plan.id}
                  >
                    {chosen ? 'Pay below' : current ? `Renew ${plan.name} for ${formatRupees(price)}` : `Pay ${formatRupees(price)} by UPI`}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <FormError message={error} />
      </CardBody>
    </Card>
  );
}

/** Paying one order: the QR code (or the UPI app link on a phone), the details to check, then the UTR. */
function UpiPayPanel({ payment }: { payment: Payment }) {
  const phone = useMediaQuery('(pointer: coarse)');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submit, submitting] = useSubmitUtrMutation();
  const [cancel, cancelling] = useCancelPaymentMutation();
  const amount = formatPaise(payment.amountPaise);
  const plan = planFromServer(payment.plan);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const problem = utrProblem(utr);
    setError(problem);
    if (problem) return;
    try {
      const res = await submit({ id: payment.id, utr: cleanUtr(utr) }).unwrap();
      toast.success(res.message);
    } catch (err) {
      const fields = getFieldErrors(err);
      if (fields.utr) setError(fields.utr);
      else setFormError(getErrorMessage(err));
    }
  };

  return (
    <Card id="upi-pay" className="scroll-mt-24 border-brand/40" data-upi-pay={payment.reference}>
      <CardHeader title={`Pay ${amount} for ${plan.name}`} description={`${periodWord(payment.period)}, order ${payment.reference}`} />
      <CardBody className="grid gap-8 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[240px]">
          {payment.upiUri && <UpiQr value={payment.upiUri} label={`UPI QR code: pay ${amount} to ${payment.payeeName}, ${payment.payeeVpa}`} />}
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-muted">
            <QrCode className="size-3.5" aria-hidden="true" /> Scan with any UPI app
          </p>
          {payment.upiUri && (
            <a href={payment.upiUri} className={buttonClass(phone ? 'primary' : 'secondary', 'md', 'mt-3 w-full')} data-upi-open="">
              <Smartphone aria-hidden="true" /> Pay with a UPI app
            </a>
          )}
        </div>
        <div className="space-y-5 text-[13.5px] text-ink-2">
          <ol className="list-decimal space-y-3 pl-5 marker:text-muted">
            <li>
              {phone ? 'Tap “Pay with a UPI app”, or scan the code from another phone.' : 'Scan the code with Google Pay, PhonePe, Paytm, BHIM or your bank’s app.'} Check that it pays{' '}
              <strong className="text-ink">{payment.payeeName}</strong> and the amount is <strong className="text-ink">{amount}</strong>.
            </li>
            <li>
              If the app won’t open or scan, pay manually:
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg border border-line bg-surface-2 p-3 text-[13px]">
                <dt className="text-muted">UPI ID</dt>
                <dd className="truncate font-medium text-ink">{payment.payeeVpa}</dd>
                <dd>
                  <CopyButton text={payment.payeeVpa} what="the UPI ID" iconOnly />
                </dd>
                <dt className="text-muted">Amount</dt>
                <dd className="font-medium text-ink">{amount}</dd>
                <dd>
                  <CopyButton text={(payment.amountPaise / 100).toFixed(2)} what="the amount" iconOnly />
                </dd>
                <dt className="text-muted">Note</dt>
                <dd className="truncate font-medium text-ink">{payment.reference}</dd>
                <dd>
                  <CopyButton text={payment.reference} what="the order reference" iconOnly />
                </dd>
              </dl>
            </li>
            <li>
              After paying, open the payment in your app and copy its 12-digit UPI reference: “UPI transaction ID” in Google Pay, “UTR” in PhonePe, “UPI Ref No.” in Paytm.
            </li>
          </ol>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3" noValidate>
            <FormError message={formError} />
            <Field label="UPI reference number (UTR)" error={error ?? undefined} hint="12 digits, for example 401234567890." required>
              {(props) => (
                <Input
                  {...props}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  placeholder="12-digit UTR"
                  data-utr-input=""
                />
              )}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={submitting.isLoading} leftIcon={<CheckCircle2 aria-hidden="true" />} data-utr-submit="">
                I’ve paid, confirm my payment
              </Button>
              <Button
                variant="ghost"
                loading={cancelling.isLoading}
                onClick={() =>
                  void cancel(payment.id)
                    .unwrap()
                    .catch((err: unknown) => setFormError(getErrorMessage(err)))
                }
              >
                Cancel this payment
              </Button>
            </div>
            <p className="text-[12.5px] text-muted">
              Pay once, exactly {amount}, and only to the UPI ID above. Your plan switches on as soon as we’ve found your payment, usually within a few hours.{' '}
              <a href="/terms#plans" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
                Payment terms <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </p>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}

function PaymentHistory({ payments }: { payments: Payment[] }) {
  const shown = payments.filter((p) => p.status !== 'CANCELLED');
  if (shown.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Payments" />
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <caption className="sr-only">Your payments</caption>
          <thead>
            <tr className="border-b border-line text-[12.5px] text-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Plan</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Amount</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Order</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 whitespace-nowrap text-ink-2">{day(p.submittedAt ?? p.createdAt)}</td>
                <td className="px-3 py-3 text-ink">
                  {planFromServer(p.plan).name}, {periodWord(p.period)}
                  {p.status === 'APPROVED' && p.periodEnd && <span className="block text-[12px] text-muted">until {day(p.periodEnd)}</span>}
                </td>
                <td className="px-3 py-3 text-ink">{formatPaise(p.amountPaise)}</td>
                <td className="px-3 py-3 text-ink-2">{p.reference}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_WORD[p.status]}</Badge>
                  {p.status === 'REJECTED' && p.decisionNote && <span className="mt-1 block text-[12px] text-muted">{p.decisionNote}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
