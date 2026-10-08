import { USE_MOCK_API } from '@/config';
import { cn } from '@/lib/cn';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/mock/demoAccounts';

/** One-click sign-in as a seeded account: demo mode and local development only. */
export default function SampleAccounts({
  disabled,
  loadingEmail,
  onPick,
}: {
  disabled: boolean;
  loadingEmail: string | null;
  onPick: (email: string, password: string) => void;
}) {
  return (
    <section className="mt-9" aria-labelledby="sample-accounts">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sample-accounts" className="text-[13px] font-semibold text-ink">
          Or try a sample account
        </h2>
        <span className="text-[12px] text-muted">
          Password <code className="rounded bg-surface-3 px-1.5 py-0.5 text-[11.5px] text-ink-2">{DEMO_PASSWORD}</code>
        </span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(a.email, DEMO_PASSWORD)}
              className={cn('block h-full w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-left shadow-card transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2 disabled:opacity-60 dark:bg-surface-2')}
              title={`${a.name}: ${a.hint}`}
            >
              <span className="block text-[11.5px] font-medium text-accent">{a.role}</span>
              <span className="mt-0.5 block text-[14px] font-semibold text-ink">{loadingEmail === a.email ? 'Signing in…' : a.name.split(' ')[0]}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted">{a.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
        {USE_MOCK_API
          ? 'Demo mode: these accounts live in this browser only.'
          : 'These exist when the backend’s demo data is on (DEMO_DATA=true, the default for local development).'}
      </p>
    </section>
  );
}
