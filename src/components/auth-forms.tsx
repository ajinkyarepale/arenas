'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

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
        Arenas is educational. Markets settle in virtual points with no cash value.
      </p>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-xs text-no">{message}</span>;
}
