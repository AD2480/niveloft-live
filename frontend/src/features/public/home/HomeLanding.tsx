import {
  ArrowRight,
  CalendarRange,
  Check,
  ChevronDown,
  Eye,
  Gauge,
  GitBranch,
  ListChecks,
  Mail,
  Minus,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/store';
import { PublicPage } from '@/components/layout/PublicFrame';
import { buttonClass } from '@/components/ui/buttonStyles';
import { CONTACT_EMAIL } from '@/config';
import { openContact } from '@/features/contact/contactStore';
import { FlurryFigure, FlurryPortrait } from '@/features/flurry/FlurryFigure';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/hooks';
import { LAYER_WORD, type LayerKey } from '@/three/snowpack';
import { ROLES } from '../content';
import { FAQ_ENTRIES } from '../faq';
import { PricingPlans } from '../PricingPlans';
import { formatRupees, PLANS } from '../pricing';
import { ONBOARDING_SAMPLE } from '../sampleProject';
import { sampleSnowpack } from './sampleSnowpack';
import { SnowpackStage } from './SnowpackStage';

const SWATCH: Record<LayerKey | 'weak', string> = {
  todo: 'var(--strata-todo)',
  progress: 'var(--strata-progress)',
  review: 'var(--strata-review)',
  done: 'var(--strata-done)',
  weak: 'var(--strata-weak)',
};

const HOME_QUESTIONS = ['what-is-projectflow', 'is-it-free', 'how-to-pay', 'drag-to-done', 'need-ai'];
const PRO = PLANS.find((p) => p.id === 'pro')!;

/** How a project reads, layer by layer: what each state means in Niveloft. */
const LAYERS: { key: LayerKey | 'weak'; title: string; body: string }[] = [
  { key: 'todo', title: 'Fresh snow', body: 'Planned, not started. Work nobody owns is named, not guessed at.' },
  { key: 'progress', title: 'Settling', body: 'Under way, forecast against each person’s real pace.' },
  { key: 'review', title: 'Waiting for sign-off', body: 'Submitted with evidence, waiting for a reviewer’s decision.' },
  { key: 'done', title: 'Firm at the base', body: 'Reviewed and approved. Every change of state is on record.' },
  { key: 'weak', title: 'The weak layer', body: 'The late task holding the most work up: the one thing to look at today.' },
];

/** What the forecast tells you, in four answers. */
const FORECAST: { title: string; body: string }[] = [
  { title: 'A finish window, not a date', body: 'The likely finish as a range, with the most likely day marked. Few records give a wide range, and Niveloft says so.' },
  { title: 'The chance of making the deadline', body: 'Simulated hundreds of times from each person’s real pace and how long reviews take, not typed in by hand.' },
  { title: 'What’s holding it up', body: 'The one task delaying delivery most, and whose work waits on it, named with a link to open it.' },
  { title: 'What it assumes', body: 'How good the data is, which estimates are missing, and how often past ranges held for finished work.' },
];

/** What the product guarantees, as a row of short promises under the first screen. */
const PROOF_POINTS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: 'Roles checked on every request' },
  { icon: ListChecks, label: 'Done only after a review' },
  { icon: Gauge, label: 'Forecasts with real ranges' },
  { icon: Eye, label: 'Free seats for clients' },
  { icon: Sparkles, label: 'AI that asks first' },
];

const WORKFLOW: { step: string; title: string; body: string }[] = [
  {
    step: '01',
    title: 'Agree what done means',
    body: 'Every task starts with acceptance criteria and a checklist that you and your client agree up front. No more arguing about scope at the end.',
  },
  {
    step: '02',
    title: 'Deliver with evidence',
    body: 'Your team submits the work with proof attached: the repository, the deployed link, screenshots, files. Every version is kept.',
  },
  {
    step: '03',
    title: 'Get it signed off',
    body: 'A reviewer checks each criterion and approves, or sends it back with notes. Your client sees the record and the forecast, live.',
  },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ListChecks, title: 'Evidence-based reviews', body: 'Work reaches Done only when someone else approves it against its criteria. The board and the API both refuse a shortcut.' },
  { icon: Gauge, title: 'Delivery forecasts', body: 'A finish window, the chance of hitting the deadline and the one task holding it up, simulated from your team’s real pace.' },
  { icon: Eye, title: 'Client viewer access', body: 'Invite clients as viewers. They follow progress, evidence and the forecast without email chains, and can’t change a thing.' },
  { icon: GitBranch, title: 'Dependencies and what-if', body: 'Map what waits on what, spot the longest chain, and preview a smaller scope or a different pace before you commit to it.' },
  { icon: CalendarRange, title: 'Board, list, timeline, calendar', body: 'One set of records, every view your team expects. Milestones, owners and due dates stay in step everywhere.' },
  { icon: Users, title: 'Four clear roles', body: 'Owner, manager, member and viewer, per project. The server checks each one on every request, not just the interface.' },
];

type Cell = boolean | string;
const COMPARISON: { label: string; niveloft: Cell; board: Cell; sheets: Cell }[] = [
  { label: 'Tasks, owners and due dates', niveloft: true, board: true, sheets: true },
  { label: 'Done requires a review against criteria', niveloft: true, board: false, sheets: false },
  { label: 'Evidence attached to every submission', niveloft: true, board: 'Comments only', sheets: false },
  { label: 'Delivery forecast with a range and odds', niveloft: true, board: false, sheets: 'Manual' },
  { label: 'The one task holding delivery up, named', niveloft: true, board: false, sheets: false },
  { label: 'Clients see progress without a paid seat', niveloft: true, board: 'Varies', sheets: 'Shared file' },
  { label: 'AI that previews every change first', niveloft: true, board: 'Varies', sheets: false },
];

/**
 * The front page, for agencies and dev shops.
 *
 * 1. The first screen: the promise, two actions, three plain facts, and a project drawn as a block
 *    of snow (an illustration: no labels, no pointer, hidden from screen readers).
 * 2. Proof points, how delivery works, the features.
 * 3. How a project reads in layers, what the forecast tells you, the four roles.
 * 4. How it compares, pricing in rupees, Flurry, questions, and the ways in (with our contact).
 */
export function HomeLanding() {
  // The block behind the first screen is an illustration: a project drawn as snow, in layers.
  const data = useMemo(() => sampleSnowpack(ONBOARDING_SAMPLE), []);
  const signedIn = useAppSelector((s) => s.auth.token !== null);
  const desktop = useMediaQuery('(min-width: 1024px)');

  // Deep links (/#features, /#pricing, …) are scrolled to by PublicPage.

  const primaryCta = signedIn ? (
    <Link to="/dashboard" className={buttonClass('primary', 'lg')}>
      Open Niveloft <ArrowRight aria-hidden="true" />
    </Link>
  ) : (
    <Link to="/register" className={buttonClass('primary', 'lg')} data-home-primary="">
      Start free <ArrowRight aria-hidden="true" />
    </Link>
  );

  // The block is pure illustration: no labels, no pointer, hidden from screen readers.
  const block = (framing: { x: number; y: number }) => (
    <SnowpackStage data={data} story={0} framing={framing} layerLabels={false} weakLabel={false} className="pointer-events-none absolute inset-0" />
  );

  return (
    <PublicPage overlay>
      {/* 1. The first screen. On large screens the block stands behind it, on the right. */}
      <div className="relative" data-home-story="">
        {desktop ? (
          <div className="absolute inset-0 overflow-hidden">
            <Sky />
            {block({ x: -0.22, y: -0.02 })}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-[linear-gradient(90deg,#e7eef4_0%,rgb(231_238_244/0.75)_55%,transparent)] dark:bg-[linear-gradient(90deg,#081019_0%,rgb(8_16_25/0.7)_55%,transparent)]" />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-[#e4ecf2] dark:bg-[#0a141d]" aria-hidden="true" />
        )}

        <section
          className={cn('pointer-events-none relative mx-auto flex max-w-[1320px] flex-col px-4 sm:px-8', desktop ? 'min-h-[100svh] justify-center pt-24 pb-12' : 'pt-28 pb-8')}
          aria-labelledby="home-title"
          data-home-hero=""
        >
          <div className="pointer-events-auto max-w-[660px]">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/75 px-3 py-1 text-[12.5px] font-medium text-ink-2 backdrop-blur-sm dark:bg-surface/50">
              <span className="size-1.5 rounded-full bg-strata-done" aria-hidden="true" />
              For agencies and dev shops
            </p>
            <h1 id="home-title" className="display-poster mt-6 text-[42px] text-ink sm:text-[60px] lg:text-[72px]">
              Deliver client work with proof, not promises.
            </h1>
            <p className="mt-6 max-w-[36rem] text-[17px] leading-relaxed text-ink-2 sm:text-[18.5px]">
              Niveloft is the project workspace where every task closes with evidence your client can see, and a forecast tells you honestly when the work will land.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {primaryCta}
              <Link to="/pricing" className={buttonClass('secondary', 'lg')} data-home-pricing="">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-muted">Free for up to 3 projects. Pro is {formatRupees(PRO.monthly)} a month for the whole workspace, paid by UPI.</p>
          </div>
          <dl className="pointer-events-auto mt-10 grid max-w-[660px] grid-cols-3 gap-4 border-t border-line/80 pt-6 sm:gap-6 lg:mt-14" data-home-readings="">
            <div>
              <dt className="text-[12.5px] text-muted">Done means</dt>
              <dd className="mt-1 text-[14px] font-medium text-balance text-ink">Reviewed, with evidence</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted">Your clients</dt>
              <dd className="mt-1 text-[14px] font-medium text-balance text-ink">Join free as viewers</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted">Delivery dates</dt>
              <dd className="mt-1 text-[14px] font-medium text-balance text-ink">A range, with odds</dd>
            </div>
          </dl>
        </section>

        {/* Phones and tablets: the block sits under the first screen. */}
        {!desktop && <div className="relative h-[38svh] min-h-[240px]">{block({ x: 0.07, y: -0.06 })}</div>}
      </div>

      {/* 2. Proof points. */}
      <div className="border-y border-line bg-surface" data-home-proof="">
        <ul className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 sm:px-8 lg:justify-between" aria-label="What you can rely on">
          {PROOF_POINTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13.5px] font-medium text-ink-2">
              <Icon className="size-4 text-accent" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <Section
        id="workflow"
        eyebrow="How it works"
        title="Scope agreed. Work proven. Client happy."
        lede="Most delivery fights start with a vague “done”. Niveloft makes done something you can point at."
      >
        <ol className="grid gap-5 md:grid-cols-3">
          {WORKFLOW.map((w, i) => (
            <li key={w.step} className="relative rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
              <span className="reading text-[15px] text-accent">{w.step}</span>
              <h3 className="mt-3 text-[19px] font-semibold text-ink">{w.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{w.body}</p>
              {i < WORKFLOW.length - 1 && (
                <ArrowRight className="absolute top-1/2 -right-4 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-canvas text-muted md:block" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="features" tone="tinted" eyebrow="Features" title="Everything a delivery team needs. Nothing it doesn’t." lede="Built for teams that ship work to clients, and have to explain where it stands.">
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-surface p-6 sm:p-7">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-[16.5px] font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. The project in layers. */}
      <Section
        id="layers"
        eyebrow="Read any project at a glance"
        title="Every project, read in layers."
        lede="Niveloft reads a project the way a forecaster reads snow: what has settled, what is still settling, and the one weak layer that will hold everything up."
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="The layers of a project">
          {LAYERS.map((l) => (
            <li key={l.key} className={cn('rounded-xl border bg-surface p-5 shadow-card', l.key === 'weak' ? 'border-strata-weak/50' : 'border-line')} data-home-step={l.key}>
              <span className="block h-1.5 w-10 rounded-full" style={{ backgroundColor: SWATCH[l.key] }} aria-hidden="true" />
              <p className="mt-4 text-[12.5px] font-medium text-muted">{l.key === 'weak' ? 'Late, and holding work up' : LAYER_WORD[l.key]}</p>
              <h3 className={cn('mt-1 text-[17px] font-semibold', l.key === 'weak' ? 'text-danger' : 'text-ink')}>{l.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{l.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="how"
        tone="tinted"
        eyebrow="Forecast"
        title="A finish date with its error bars showing."
        lede="Niveloft doesn’t ask an AI for a date. It simulates the open work from your records: each person’s real pace, what waits on what, and how long reviews take."
      >
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FORECAST.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <Gauge className="size-5 text-accent" aria-hidden="true" />
              <h3 className="mt-4 text-[16px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="roles"
        eyebrow="Roles"
        title="Your team, your reviewers, your client. One source of truth."
        lede="Four roles per project, checked by the server on every request. Each one opens on the view that answers its own question."
      >
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <li key={r.role} className="rounded-2xl border border-line bg-surface p-6 shadow-card" data-home-role={r.role}>
              <h3 className="text-[16px] font-semibold text-ink">
                {r.label}
                {r.role === 'VIEWER' && <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-medium text-success">Free</span>}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{r.summary}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[14px] text-muted">
          <Link to="/introduction#roles" className="font-medium text-accent hover:underline">
            See exactly what each role can do
          </Link>
        </p>
      </Section>

      {/* 4. How it compares. */}
      <Section
        id="compare"
        tone="tinted"
        eyebrow="Compare"
        title="Built for delivery, not just tracking."
        lede="Task boards track work. Niveloft proves it was delivered, and tells you when the rest will be. Here is how it compares with the tools most agencies use today."
      >
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-raised">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <caption className="sr-only">Niveloft compared with a typical task board and with spreadsheets and email</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-medium text-muted">
                  Capability
                </th>
                <th scope="col" className="bg-brand-soft/60 px-5 py-4 font-semibold text-ink">
                  Niveloft
                </th>
                <th scope="col" className="px-5 py-4 font-medium text-ink-2">
                  Typical task board
                </th>
                <th scope="col" className="px-5 py-4 font-medium text-ink-2">
                  Spreadsheets and email
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-5 py-3.5 font-medium text-ink">
                    {r.label}
                  </th>
                  <td className="bg-brand-soft/60 px-5 py-3.5">
                    <Mark value={r.niveloft} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Mark value={r.board} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Mark value={r.sheets} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="pricing" eyebrow="Pricing" title="Start free. Pay when your agency grows." lede="One price for the whole workspace, in rupees, paid by UPI. Your clients join as viewers at no cost.">
        <PricingPlans compact />
        <p className="mt-4 text-center text-[14px]">
          <Link to="/pricing" className="font-medium text-accent hover:underline">
            Compare plans and read the pricing questions
          </Link>
        </p>
      </Section>

      <Section id="flurry" tone="tinted" eyebrow="AI assistant" title="An assistant that says what it doesn’t know." lede="">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <p className="max-w-[60ch] text-[17px] leading-relaxed text-ink-2">
              Flurry is Niveloft’s project assistant. It plans a project from a client brief, summarises progress for your status update and reviews blockers, and it explains the forecast rather than inventing one.
            </p>
            <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {[
                ['Only what you can see', 'It answers from the records you already have access to, and links the tasks it used.'],
                ['Facts apart from guesses', 'It keeps what’s recorded, what’s estimated and what’s missing separate. It never makes up a date.'],
                ['Asks before it changes anything', 'It never approves work, assigns people or moves a deadline on its own; every change is previewed and can be undone.'],
                ['Clear about its sources', 'Each answer says whether it came from your records or from an AI model, and which one.'],
              ].map(([t, x]) => (
                <li key={t}>
                  <p className="text-[14.5px] font-semibold text-ink">{t}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">{x}</p>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/flurry" className={buttonClass('secondary', 'lg')} data-home-meet-flurry="">
                Meet Flurry
              </Link>
              <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                <FlurryFigure className="size-6" glow={false} still mini /> In the app: click Flurry, or press Alt+A
              </span>
            </div>
          </div>
          <figure className="relative mx-auto w-full max-w-[340px]">
            <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--frost)_55%,transparent),transparent_70%)] blur-2xl" aria-hidden="true" />
            <FlurryPortrait size={480} className="relative h-auto w-full" />
          </figure>
        </div>
      </Section>

      <Section id="questions" eyebrow="Questions" title="What people ask before they trust it." lede="">
        <div className="max-w-[860px] divide-y divide-line border-y border-line">
          {HOME_QUESTIONS.map((q) => FAQ_ENTRIES.find((e) => e.id === q))
            .filter((e): e is NonNullable<typeof e> => e !== undefined)
            .map((e) => (
              <details key={e.id} className="disclosure group" data-home-question={e.id}>
                <summary className="flex items-start gap-4 py-5 transition-colors hover:text-accent">
                  <h3 className="min-w-0 flex-1 text-[16.5px] leading-snug font-medium text-ink">{e.question}</h3>
                  <ChevronDown className="disclosure-icon mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                </summary>
                <div className="disclosure-body max-w-[70ch] space-y-2 pb-6 text-[15px] leading-relaxed text-ink-2">
                  {e.answer.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            ))}
        </div>
        <p className="mt-6 text-[14px] text-muted">
          More answers on the{' '}
          <Link to="/faq" className="font-medium text-accent hover:underline">
            questions page
          </Link>
          , and the whole idea in the{' '}
          <Link to="/introduction" className="font-medium text-accent hover:underline">
            introduction
          </Link>
          .
        </p>
      </Section>

      {/* The ways in. */}
      <section id="begin" className="relative overflow-hidden border-t border-line bg-graphite text-[#e7eef4]" aria-labelledby="begin-title" data-home-begin="">
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_85%_10%,rgb(147_197_234/0.2),transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:py-28">
          <div>
            <h2 id="begin-title" className="display-wide text-[40px] text-[#f2f5f8] sm:text-[56px]">
              Your next client project, delivered with proof.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-[#c3ceda]">
              Create a workspace in a minute, invite your team, and add your client as a viewer. Free for up to 3 projects.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <Link to="/dashboard" className={buttonClass('primary', 'lg', 'bg-[#93c5ea] text-[#0a131b] hover:bg-[#b3d7f1]')}>
                  Open Niveloft
                </Link>
              ) : (
                <Link to="/register" className={buttonClass('primary', 'lg', 'bg-[#93c5ea] text-[#0a131b] hover:bg-[#b3d7f1]')}>
                  Start free <ArrowRight aria-hidden="true" />
                </Link>
              )}
              <Link to="/pricing" className={buttonClass('outline', 'lg', 'border-[#344659] text-[#e7eef4] hover:bg-white/5 hover:border-[#5a7189]')}>
                See pricing
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-[#233140] bg-[#101b24] p-6 shadow-float sm:p-7" data-home-contact="">
            <p className="text-[15px] font-semibold text-[#e7eef4]">Questions before you start?</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#c3ceda]">
              Ask about plans, payments, moving your projects in or anything else. We answer every message, usually within a working day.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openContact()}
                className={buttonClass('primary', 'md', 'bg-[#93c5ea] text-[#0a131b] hover:bg-[#b3d7f1]')}
              >
                Send us a message
              </button>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-[14px] font-medium text-[#93c5ea] hover:underline">
                <Mail className="size-4" aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

/** A comparison cell: a tick, a dash, or a short qualifier. */
function Mark({ value }: { value: Cell }) {
  if (value === true)
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <Check className="size-4" aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center text-muted">
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  return <span className="text-[13px] text-muted">{value}</span>;
}

/** The sky behind the first screen: first light (light theme), a clear night (dark). */
function Sky() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#e7eef4_0%,#dfe8ef_45%,#d3dee7_100%)] dark:bg-[linear-gradient(180deg,#081019_0%,#0b1620_50%,#0f1c28_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_70%_58%,rgb(255_255_255/0.7),transparent_70%)] dark:bg-[radial-gradient(60%_55%_at_70%_58%,rgb(80_120_160/0.18),transparent_70%)]" />
    </div>
  );
}

function Section({ id, eyebrow, title, lede, tone, children }: { id: string; eyebrow?: string; title: string; lede: string; tone?: 'tinted'; children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-16 border-t border-line', tone === 'tinted' ? 'bg-surface-2/70 dark:bg-surface/40' : 'bg-canvas')} aria-labelledby={`${id}-title`} data-home-section={id}>
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
        <div className="max-w-[780px]">
          {eyebrow && <p className="text-[13.5px] font-medium text-accent">{eyebrow}</p>}
          <h2 id={`${id}-title`} className={cn('display-wide text-[34px] text-ink sm:text-[48px]', eyebrow && 'mt-3')}>
            {title}
          </h2>
          {lede && <p className="mt-5 max-w-[64ch] text-[16.5px] leading-relaxed text-ink-2">{lede}</p>}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
