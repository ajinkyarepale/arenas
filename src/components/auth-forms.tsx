'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';

function useCallbackUrl(fallback = '/dashboard'): string {
  const params = useSearchParams();
  const raw = params.get('callbackUrl');
  // Only ever redirect to a path on this origin — an absolute URL here would be
  // an open redirect.
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}

export function SignInForm() {
  const router = useRouter();
  const callbackUrl = useCallbackUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (!result || result.error) {
      // Deliberately vague: confirming which half was wrong would let someone
      // enumerate registered emails.
      setError('That email and password do not match an account.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="label">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
          placeholder="you@college.edu"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
          placeholder="••••••••"
        />
      </label>

      <ErrorNote>{error}</ErrorNote>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? <Spinner /> : null}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-fg-muted">
        No account?{' '}
        <Link
          href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-accent hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const callbackUrl = useCallbackUrl();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wantsOrganizer, setWantsOrganizer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, wantsOrganizer }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? 'Could not create that account.');
        setFieldErrors(body.fields ?? {});
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError('Account created, but sign-in failed. Try signing in.');
        return;
      }

      router.push(wantsOrganizer ? '/admin' : callbackUrl);
      router.refresh();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="label">Name</span>
        <input
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field"
          placeholder="How you appear on the leaderboard"
        />
        <FieldError message={fieldErrors.name} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
          placeholder="you@college.edu"
        />
        <FieldError message={fieldErrors.email} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
          placeholder="At least 8 characters"
        />
        <FieldError message={fieldErrors.password} />
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded border border-line bg-ink-900 p-4">
        <input
          type="checkbox"
          checked={wantsOrganizer}
          onChange={(event) => setWantsOrganizer(event.target.checked)}
          className="mt-0.5 h-5 w-5 accent-accent"
        />
        <span>
          <span className="block text-sm font-semibold">I am running an event</span>
          <span className="mt-0.5 block text-xs text-fg-muted">
            Gives you the organizer tools: create arenas, hand out a join code, and run the
            session from a control panel.
          </span>
        </span>
      </label>

      <ErrorNote>{error}</ErrorNote>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? <Spinner /> : null}
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-fg-muted">
        Already have one?{' '}
        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-fg-faint">
        Arenas is educational. Markets settle in Arcs — virtual credits with no cash value.
      </p>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-xs text-no">{message}</span>;
}

export function GoogleButton({ callbackUrl, label = 'Continue with Google' }: { callbackUrl: string; label?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn('google', { callbackUrl });
      }}
      className="btn-secondary w-full"
    >
      {pending ? (
        <Spinner />
      ) : (
        <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
        </svg>
      )}
      {pending ? 'Redirecting…' : label}
    </button>
  );
}

/** Google button that honours ?callbackUrl= like the other forms. */
export function GoogleCallbackButton({ label }: { label?: string }) {
  const callbackUrl = useCallbackUrl();
  return <GoogleButton callbackUrl={callbackUrl} label={label} />;
}

export function Divider({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3" aria-hidden={children ? undefined : true}>
      <span className="h-px flex-1 bg-ink-750" />
      {children ? <span className="text-xs font-semibold text-fg-faint">{children}</span> : null}
      <span className="h-px flex-1 bg-ink-750" />
    </div>
  );
}

type OtpStep = 'email' | 'code';

/**
 * Passwordless sign-in (and signup) by email code. One flow covers both:
 * a code for an unknown address creates a PARTICIPANT account on redeem.
 */
export function OtpForm() {
  const router = useRouter();
  const callbackUrl = useCallbackUrl();
  const [step, setStep] = useState<OtpStep>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffectCooldown(cooldown, setCooldown);

  const send = async (address: string) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: address }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not send a code. Try again shortly.');
        return false;
      }
      setCooldown(30);
      setStep('code');
      return true;
    } catch {
      setError('Network problem — please try again.');
      return false;
    } finally {
      setPending(false);
    }
  };

  const confirm = async (event?: React.FormEvent, overrideCode?: string) => {
    event?.preventDefault();
    const finalCode = (overrideCode ?? code).trim();
    if (finalCode.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setPending(true);
    setError(null);

    const result = await signIn('email-otp', {
      email,
      code: finalCode,
      name,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (!result || result.error) {
      setError('That code did not work. Check the latest email, or request a new code.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  if (step === 'email') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(email);
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="label">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            placeholder="you@college.edu"
          />
        </label>

        <ErrorNote>{error}</ErrorNote>

        <button type="submit" disabled={pending || email.trim().length < 3} className="btn-primary w-full">
          {pending ? <Spinner /> : null}
          {pending ? 'Sending…' : 'Email me a code'}
        </button>
        <p className="text-center text-xs text-fg-faint">
          New here? The same code step creates your account.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void confirm(e)} className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        Code sent to <span className="font-semibold text-fg">{email}</span>.{' '}
        <button type="button" onClick={() => { setStep('email'); setCode(''); setError(null); }} className="font-semibold text-accent hover:underline">
          Change
        </button>
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="label">6-digit code</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(event) => {
            const next = event.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            setCode(next);
            if (next.length === 6) void confirm(undefined, next);
          }}
          className="field tnum text-center !text-2xl font-extrabold tracking-[0.3em]"
          placeholder="••••••"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Display name <span className="normal-case text-fg-faint">(new accounts only)</span></span>
        <input
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field"
          placeholder="How you appear on leaderboards"
        />
      </label>

      <ErrorNote>{error}</ErrorNote>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? <Spinner /> : null}
        {pending ? 'Checking…' : 'Sign in'}
      </button>

      <button
        type="button"
        disabled={pending || cooldown > 0}
        onClick={() => void send(email)}
        className="text-center text-sm font-semibold text-fg-muted transition-colors hover:text-fg disabled:opacity-45"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </form>
  );
}

function useEffectCooldown(value: number, setValue: (n: number) => void) {
  useEffect(() => {
    if (value <= 0) return;
    const timer = setTimeout(() => setValue(value - 1), 1000);
    return () => clearTimeout(timer);
  }, [value, setValue]);
}

/** Sign-in panel: Google (when configured), then code/password tabs. */
export function SignInPanel({ googleEnabled }: { googleEnabled: boolean }) {
  const callbackUrl = useCallbackUrl();
  const [tab, setTab] = useState<'code' | 'password'>('code');

  return (
    <div className="flex flex-col gap-4">
      {googleEnabled ? (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <Divider>or</Divider>
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-ink-950 p-1" role="tablist" aria-label="Sign-in method">
        {(['code', 'password'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'h-10 rounded-lg bg-ink-750 text-sm font-bold text-fg shadow-panel'
                : 'h-10 rounded-lg text-sm font-semibold text-fg-faint transition-colors hover:text-fg-muted'
            }
          >
            {t === 'code' ? 'Email code' : 'Password'}
          </button>
        ))}
      </div>

      {tab === 'code' ? <OtpForm /> : <SignInForm />}
    </div>
  );
}
