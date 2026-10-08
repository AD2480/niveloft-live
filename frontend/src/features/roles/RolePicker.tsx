import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLoginMutation } from '@/api/endpoints';
import { getErrorMessage } from '@/api/errors';
import { useAppDispatch } from '@/app/store';
import { Button } from '@/components/ui/Button';
import { USE_MOCK_API } from '@/config';
import { credentialsReceived } from '@/features/auth/authSlice';
import { cn } from '@/lib/cn';
import { PERSONAS, savePersona, setPendingPersona, START_PATH, type Persona } from '@/lib/persona';

/** The radio cards themselves (also used on the sign-up form). */
export function PersonaOptions({ value, onChange, compact = false, name = 'persona' }: { value: Persona | null; onChange: (p: Persona) => void; compact?: boolean; name?: string }) {
  return (
    <div role="radiogroup" aria-label="How will you use Niveloft?" className="grid grid-cols-2 gap-2">
      {PERSONAS.map((p) => {
        const on = value === p.value;
        return (
          <label
            key={p.value}
            className={cn(
              'relative flex cursor-pointer flex-col rounded-lg border border-line bg-surface p-3.5 shadow-card transition-[border-color,background-color,box-shadow] hover:border-line-strong has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent dark:bg-surface-2',
              on && 'border-brand/60 bg-brand-soft ring-1 ring-brand/30 hover:border-brand/60 dark:bg-brand-soft',
            )}
          >
            <input type="radio" name={name} value={p.value} checked={on} onChange={() => onChange(p.value)} className="sr-only" />
            <span className="flex items-start justify-between gap-2">
              <span className="text-[13.5px] font-semibold text-ink">{p.title}</span>
              <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-brand bg-brand text-white dark:text-canvas' : 'border-line-strong')} aria-hidden="true">
                {on && <Check className="size-3" />}
              </span>
            </span>
            <span className="mt-0.5 text-[11.5px] font-medium text-accent">{p.line}</span>
            {!compact && (
              <ul className="mt-2 space-y-0.5 text-[12px] leading-snug text-muted">
                {p.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            )}
          </label>
        );
      })}
    </div>
  );
}

/**
 * "How will you use Niveloft?" on the front page. In demo mode, choosing a role signs you in as
 * the sample person who has it. On a real site it leads to sign-up and shapes your first steps;
 * permissions still come from each project (you own the projects you create).
 */
export function RolePicker() {
  const [persona, setPersona] = useState<Persona>('OWNER');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);
  const chosen = PERSONAS.find((p) => p.value === persona)!;

  const go = async () => {
    setError(null);
    if (!USE_MOCK_API) {
      setPendingPersona(persona);
      navigate('/register', { state: { persona } });
      return;
    }
    // Demo: step in as the sample person with that role (they exist only in this browser).
    try {
      const { DEMO_ACCOUNTS, DEMO_PASSWORD } = await import('@/mock/demoAccounts');
      const account = DEMO_ACCOUNTS.find((a) => a.role.toUpperCase() === persona);
      if (!account) return;
      const res = await login({ email: account.email, password: DEMO_PASSWORD }).unwrap();
      savePersona(res.user.id, persona);
      dispatch(credentialsReceived({ token: res.token, user: res.user }));
      navigate(START_PATH[persona]);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div>
      <p id="role-picker" className="text-[13px] font-medium text-ink">
        How will you use Niveloft?
      </p>
      <div className="mt-3">
        <PersonaOptions value={persona} onChange={setPersona} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button size="lg" onClick={() => void go()} loading={isLoading}>
          {USE_MOCK_API ? `Try it as ${chosen.line.split(' ')[0]}` : 'Create your workspace'}
        </Button>
        <p className="text-[13px] text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Log in
          </Link>
        </p>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {USE_MOCK_API
          ? 'Demo: you’ll sign in as a sample person with that role. Nothing leaves this browser.'
          : 'This sets up your start page. In each project your role is set by its owner; projects you create are yours.'}
      </p>
      {error && (
        <p className="mt-2 text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
