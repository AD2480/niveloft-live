import { Check } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/store';
import { buttonClass } from '@/components/ui/buttonStyles';
import { cn } from '@/lib/cn';
import { formatRupees, monthsFree, planLink, PLANS, type Period, type Plan } from './pricing';

const FREE_MONTHS = monthsFree();
const PERIODS: { value: Period; label: string; note: string }[] = [
  { value: 'year', label: 'Yearly', note: FREE_MONTHS > 0 ? `${FREE_MONTHS} months free` : '' },
  { value: 'month', label: 'Monthly', note: '' },
];

/** The three plans side by side, with a yearly / monthly switch. Used on the front page and /pricing. */
export function PricingPlans({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useState<Period>('year');
  const signedIn = useAppSelector((s) => s.auth.token !== null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // A radio group moves with the arrow keys, and only the checked option is a tab stop.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const current = PERIODS.findIndex((p) => p.value === period);
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? PERIODS.length - 1 : (current + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + PERIODS.length) % PERIODS.length;
    setPeriod(PERIODS[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div data-pricing="">
      <div className="mb-8 flex justify-center">
        <div role="radiogroup" aria-label="Billing period" onKeyDown={onKeyDown} className="inline-flex rounded-full border border-line bg-surface p-1 shadow-card">
          {PERIODS.map((o, i) => {
            const checked = period === o.value;
            return (
              <button
                key={o.value}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => setPeriod(o.value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors',
                  checked ? 'bg-brand text-white dark:text-canvas' : 'text-ink-2 hover:text-ink',
                )}
              >
                {o.label}
                {o.note && <span className={cn('ml-1.5 text-[12px]', checked ? 'opacity-85' : 'text-success')}>{o.note}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {/* Announces the price change to screen readers when the period switches. */}
      <p className="sr-only" aria-live="polite">
        {period === 'year' ? 'Showing yearly prices.' : 'Showing monthly prices.'}
      </p>
      <ul className={cn('grid gap-5 lg:grid-cols-3', compact ? 'lg:gap-5' : 'lg:gap-6')} aria-label="Plans">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} period={period} signedIn={signedIn} />
        ))}
      </ul>
      <p className="mt-6 text-center text-[13px] text-muted">
        Prices in Indian rupees, per workspace (not per person). Pay by UPI from any UPI app. Plans don’t renew by themselves.
      </p>
    </div>
  );
}

function PlanCard({ plan, period, signedIn }: { plan: Plan; period: Period; signedIn: boolean }) {
  const free = plan.monthly === 0;
  const price = period === 'year' ? plan.yearly : plan.monthly;
  const unit = free ? 'Free forever, no card or UPI needed' : period === 'year' ? `per year (${formatRupees(Math.round(plan.yearly / 12))} a month)` : 'per month';
  const cta = buttonClass(plan.highlighted ? 'primary' : 'secondary', 'lg', 'mt-7 w-full');
  const label = free ? (signedIn ? 'Open Niveloft' : 'Start free') : `Choose ${plan.name}`;
  return (
    <li
      className={cn(
        'relative flex flex-col rounded-2xl border bg-surface p-6 sm:p-7',
        plan.highlighted ? 'border-brand shadow-float ring-1 ring-brand/30' : 'border-line shadow-raised',
      )}
      data-plan={plan.id}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-white dark:text-canvas">Recommended for agencies</span>
      )}
      <h3 className="text-[18px] font-semibold text-ink">{plan.name}</h3>
      <p className="mt-1.5 min-h-[44px] text-[14px] leading-relaxed text-muted">{plan.tagline}</p>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="reading text-[44px] leading-none text-ink">{formatRupees(price)}</span>
      </p>
      <p className="mt-2 text-[13px] text-muted">{unit}</p>
      <Link to={planLink(plan, period, signedIn)} className={cta} data-plan-cta={plan.id}>
        {label}
      </Link>
      <p className="mt-7 text-[13px] font-semibold text-ink">{plan.includesLabel}</p>
      <ul className="mt-3 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5 text-[14px] leading-snug text-ink-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
    </li>
  );
}
