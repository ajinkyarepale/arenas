'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';

function useCallbackUrl(fallback = '/dashboard'): string {
  const params = useSearchParams();
  const raw = params.get('callbackUrl');
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
      setError('Invalid email or password. Please try again.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="w-full font-['Geist'] text-sm">
      <h2 className="font-['Geist'] text-2xl font-bold mb-4 text-white">Sign in to Arena</h2>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-[12px] px-4 py-3 font-['Epilogue'] text-xs focus:outline-none focus:border-white transition-colors text-white placeholder-[#8e9192]"
            placeholder="you@college.edu"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">
              Password
            </label>
            <span className="font-['Epilogue'] text-[11px] text-[#c4c7c8] hover:text-white cursor-pointer transition-colors">
              Forgot?
            </span>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-[12px] px-4 py-3 font-['Epilogue'] text-xs focus:outline-none focus:border-white transition-colors text-white placeholder-[#8e9192]"
            placeholder="••••••••"
          />
        </div>

        <ErrorNote>{error}</ErrorNote>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-white text-[#2f3131] font-['Epilogue'] font-bold rounded-full py-3 mt-2 hover:bg-[#c6c6c7] transition-colors flex items-center justify-center gap-2"
        >
          {pending ? <Spinner className="border-[#2f3131] border-t-transparent" /> : null}
          {pending ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-[#c4c7c8] mt-4">
          Don&apos;t have an account?{' '}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-bold text-white hover:underline ml-1"
          >
            Sign up
          </Link>
        </p>

        <div className="text-center pt-3 mt-1 border-t border-[#27272A]">
          <Link
            href="/host"
            className="font-['Epilogue'] text-xs text-[#a1a1aa] hover:text-white transition-colors inline-flex items-center gap-1.5 group"
          >
            <span>Are you an organizer?</span>
            <span className="text-white font-bold group-hover:underline">Apply for Hosting Access →</span>
          </Link>
        </div>
      </form>
    </div>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const callbackUrl = useCallbackUrl();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'PARTICIPANT' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create account');
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      setPending(false);

      if (!result || result.error) {
        router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Could not create account');
    }
  };

  return (
    <div className="w-full font-['Geist'] text-sm">
      <h2 className="font-['Geist'] text-2xl font-bold mb-4 text-white">Create an account</h2>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
            Display Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-[12px] px-4 py-3 font-['Epilogue'] text-xs focus:outline-none focus:border-white transition-colors text-white placeholder-[#8e9192]"
            placeholder="Campus Trader"
          />
        </div>

        <div>
          <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-[12px] px-4 py-3 font-['Epilogue'] text-xs focus:outline-none focus:border-white transition-colors text-[#e5e2e1] placeholder-[#8e9192]"
            placeholder="you@college.edu"
          />
        </div>

        <div>
          <label className="block font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-1">
            Password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-[12px] px-4 py-3 font-['Epilogue'] text-xs focus:outline-none focus:border-white transition-colors text-[#e5e2e1] placeholder-[#8e9192]"
            placeholder="••••••••"
          />
        </div>

        <ErrorNote>{error}</ErrorNote>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-white text-[#2f3131] font-['Epilogue'] font-bold rounded-full py-3 mt-2 hover:bg-[#c6c6c7] transition-colors flex items-center justify-center gap-2"
        >
          {pending ? <Spinner className="border-[#2f3131] border-t-transparent" /> : null}
          {pending ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-[#c4c7c8] mt-2">
          Already have an account?{' '}
          <Link
            href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-bold text-white hover:underline ml-1"
          >
            Sign in
          </Link>
        </p>

        <div className="text-center pt-3 mt-1 border-t border-[#27272A]">
          <Link
            href="/host"
            className="font-['Epilogue'] text-xs text-[#a1a1aa] hover:text-white transition-colors inline-flex items-center gap-1.5 group"
          >
            <span>Looking to host campus tournaments?</span>
            <span className="text-white font-bold group-hover:underline">Apply as Organizer →</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
