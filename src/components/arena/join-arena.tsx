'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorNote, Spinner } from '@/components/ui';

export function JoinArena({
  arenaCode,
  defaultCode,
  isLoggedIn,
  userName,
  isAlreadyJoined,
}: {
  arenaCode: string;
  defaultCode: string;
  isLoggedIn: boolean;
  userName?: string;
  isAlreadyJoined: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(userName || '');
  const [accessCode, setAccessCode] = useState(defaultCode || arenaCode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push(`/signin?callbackUrl=${encodeURIComponent(`/arenas/${arenaCode}`)}`);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/arenas/${arenaCode}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: accessCode, displayName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not join arena');
      }

      router.push(`/arenas/${arenaCode}/live`);
      router.refresh();
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Could not join arena');
    }
  };

  if (isAlreadyJoined) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="p-4 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-xs font-['Epilogue'] font-bold tracking-wider">
          YOU ARE REGISTERED IN THIS ARENA
        </div>
        <Link
          href={`/arenas/${arenaCode}/live`}
          className="w-full bg-white text-[#2f3131] rounded-full py-3.5 font-['Epilogue'] text-sm font-bold hover:bg-[#c6c6c7] transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <span>Enter Trading Terminal</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="p-4 rounded-xl border border-[#27272A] bg-[#201f1f] text-[#c4c7c8] text-xs leading-relaxed">
          Authentication is mandatory to participate in prediction markets and record trading scores.
        </div>

        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(`/arenas/${arenaCode}`)}`}
          className="w-full bg-white text-[#2f3131] rounded-full py-3.5 font-['Epilogue'] text-sm font-bold hover:bg-[#c6c6c7] transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <span>Sign In to Enter Arena</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>

        <p className="text-center font-['Geist'] text-xs text-[#c4c7c8]">
          Don&apos;t have an account?{' '}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(`/arenas/${arenaCode}`)}`}
            className="text-white font-bold hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-4 font-['Geist'] text-xs">
      <div className="space-y-1">
        <label className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase pl-1" htmlFor="displayName">
          Display Name
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c4c7c8] text-sm">
            person
          </span>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 font-['Epilogue'] text-xs text-white focus:border-white focus:outline-none transition-all placeholder-[#8e9192]"
            placeholder="Trader Name"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase pl-1" htmlFor="joinCode">
          Access Code
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c4c7c8] text-sm">
            lock
          </span>
          <input
            id="joinCode"
            type="text"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 font-['Epilogue'] text-xs text-white tracking-widest uppercase focus:border-white focus:outline-none transition-all placeholder-[#8e9192]"
            placeholder="CODE"
          />
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full bg-white text-[#2f3131] rounded-full py-3.5 font-['Epilogue'] text-sm font-bold hover:bg-[#c6c6c7] transition-all flex items-center justify-center gap-2 shadow-lg"
      >
        {pending ? <Spinner className="border-[#2f3131] border-t-transparent" /> : null}
        <span>{pending ? 'Joining Arena…' : 'Enter Arena'}</span>
        {!pending ? <span className="material-symbols-outlined text-sm">arrow_forward</span> : null}
      </button>

      <p className="text-center font-['Geist'] text-[11px] text-[#c4c7c8] mt-1">
        By joining, you agree to the{' '}
        <Link href="/guide" className="underline hover:text-white transition-colors">
          Rules of Play
        </Link>
        .
      </p>
    </form>
  );
}
