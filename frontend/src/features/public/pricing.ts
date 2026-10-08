/**
 * Plans shown on the front page, on /pricing and in Settings → Plan and billing. Prices are in
 * Indian rupees, per workspace (the account that owns the projects), paid by UPI.
 *
 * The server has the same numbers in backend/src/main/java/dev/projectflow/billing/Plan.java and
 * charges from there; change both together.
 */
import type { BillingPeriod, PlanId as ServerPlanId } from '@/api/types';

export type PlanId = 'free' | 'pro' | 'team';
export type Period = 'month' | 'year';

export interface Plan {
  id: PlanId;
  name: string;
  /** Price of a month, in rupees. 0 is free. */
  monthly: number;
  /** Price of a year, in rupees (two months free). */
  yearly: number;
  tagline: string;
  /** Active projects one account can own (0: no plan limit). */
  maxActiveProjects: number;
  /** Owners, managers and members per project; viewers (clients) are always free. */
  maxPeople: number;
  /** "Everything in Pro, plus:" style heading for the list. */
  includesLabel: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    yearly: 0,
    tagline: 'For freelancers and small teams running their first client project.',
    maxActiveProjects: 3,
    maxPeople: 5,
    includesLabel: 'Includes',
    features: [
      'Up to 3 active projects',
      'Up to 5 people per project',
      'Unlimited client viewers, free',
      'Board, list, timeline and calendar',
      'Reviews with acceptance criteria and evidence',
      'Delivery forecasts and Flurry, the AI assistant',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 999,
    yearly: 9990,
    tagline: 'For agencies running several client projects at once.',
    maxActiveProjects: 0,
    maxPeople: 15,
    includesLabel: 'Everything in Free, plus',
    features: ['Unlimited active projects', 'Up to 15 people per project', 'Unlimited client viewers, free', 'Email support'],
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    monthly: 2499,
    yearly: 24990,
    tagline: 'For studios with bigger teams on every project.',
    maxActiveProjects: 0,
    maxPeople: 50,
    includesLabel: 'Everything in Pro, plus',
    features: ['Up to 50 people per project', 'Priority email support', 'Help moving your projects in'],
  },
];

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I pay?',
    a: 'By UPI, from any UPI app (Google Pay, PhonePe, Paytm, BHIM or your bank’s app). In Settings → Plan and billing, choose a plan, scan the QR code or tap “Pay with a UPI app”, then enter the 12-digit UPI reference (UTR) from your app. We check the payment and switch your plan on, usually within a few hours and always within one working day.',
  },
  { q: 'Do clients need a paid seat?', a: 'No. Viewers, usually your clients, are free and unlimited on every plan. They see progress, evidence and the delivery forecast, and can’t change anything.' },
  {
    q: 'Does it renew automatically?',
    a: 'No. You pay for a month or a year at a time, and we email you a week before it ends. If you don’t renew, nothing is deleted: your projects stay as they are, and the Free plan’s limits apply to new projects and new people.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes. Paying again for the plan you have adds the new period after the current one. Moving from Pro to Team starts Team straight away, and your unused Pro time is turned into Team time by value.',
  },
  {
    q: 'What if something goes wrong with a payment?',
    a: 'If we can’t find your payment we tell you why, and nothing on your account changes. If money left your account for a payment we couldn’t confirm, or you paid twice by mistake, we refund it to the account it came from. See the terms for the details.',
  },
];

/** Rupees for a plan and period. */
export function priceOf(plan: Plan, period: Period): number {
  return period === 'year' ? plan.yearly : plan.monthly;
}

/** ₹999, ₹24,990, ₹1,00,000 (Indian digit grouping); paise only when there are some. */
export function formatRupees(rupees: number): string {
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
}

/** Amounts from the server are in paise (₹1 = 100 paise). */
export const formatPaise = (paise: number) => formatRupees(paise / 100);

/** How many months a year's price saves, for "2 months free" (the smallest across paid plans, so it's true for each). */
export function monthsFree(plans: Plan[] = PLANS): number {
  const paid = plans.filter((p) => p.monthly > 0);
  if (paid.length === 0) return 0;
  return Math.min(...paid.map((p) => Math.floor(12 - p.yearly / p.monthly + 1e-9)));
}

export const planById = (id: string | null | undefined): Plan | undefined => PLANS.find((p) => p.id === (id ?? '').toLowerCase());

/** "month"/"monthly"/"MONTH" → month; anything else (including nothing) → year. */
export const toPeriod = (s: string | null | undefined): Period => ((s ?? '').toLowerCase().startsWith('m') ? 'month' : 'year');

export const serverPlan = (id: PlanId): Exclude<ServerPlanId, 'FREE'> | null => (id === 'pro' ? 'PRO' : id === 'team' ? 'TEAM' : null);
export const serverPeriod = (p: Period): BillingPeriod => (p === 'year' ? 'YEAR' : 'MONTH');
export const planFromServer = (id: ServerPlanId): Plan => PLANS.find((p) => p.id === id.toLowerCase()) ?? PLANS[0];

/** Where a plan's button goes: sign-up first for visitors, straight to payment once signed in. */
export function planLink(plan: Plan, period: Period, signedIn: boolean): string {
  if (plan.monthly === 0) return signedIn ? '/dashboard' : '/register';
  const q = `plan=${plan.id}&period=${period}`;
  return signedIn ? `/settings?tab=billing&${q}` : `/register?${q}`;
}
