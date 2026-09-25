'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorNote, Panel, Spinner } from '@/components/ui';
import { Arcs } from '@/components/arcs-mark';

/**
 * The join gate.
 *
 * The code is already in the URL when someone follows a link or scans a QR
 * code, so this screen mostly exists to confirm what they are joining and to
 * hand out the starting balance. Someone who typed the code themselves gets to
 * check it against the arena name before committing.
 */
export function JoinArena({
  code,
  name,
  status,
  alreadyJoined,
  balance,
  startingBalance,
  signedIn,
}: {
  code: string;
  name: string;
  status: string;
  alreadyJoined: boolean;
  balance: number | null;
  startingBalance: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState(code);

  const closed = status === 'ENDED';
  const notOpen = status === 'DRAFT';

  if (!signedIn) {
    return (
      <Panel className="p-6">
        <h2 className="text-lg font-semibold">Sign in to join</h2>
        <p className="mt-2 text-sm text-fg-muted">
          You need an account so your Arcs, positions and results follow you across
          rounds. It takes a few seconds.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(`/arenas/${code}`)}`}
            className="btn-primary flex-1"
          >
            Create an account
          </Link>
          <Link
            href={`/signin?callbackUrl=${encodeURIComponent(`/arenas/${code}`)}`}
            className="btn-secondary flex-1"
          >
            Sign in
          </Link>
        </div>
      </Panel>
    );
  }

  if (alreadyJoined) {
    return (
      <Panel className="p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yes/15 text-yes">
            ✓
          </span>
          <h2 className="text-lg font-semibold">You are in</h2>
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          Your balance in {name} is{' '}
          <span className="font-semibold text-fg">
            <Arcs value={balance ?? startingBalance} />
          </span>
          .
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {closed ? (
            <Link href={`/arenas/${code}/results`} className="btn-primary flex-1">
              See final results
            </Link>
          ) : (
            <Link href={`/arenas/${code}/live`} className="btn-primary flex-1">
              Open trading screen
            </Link>
          )}
          <Link href={`/arenas/${code}/results`} className="btn-secondary flex-1">
            Round history
          </Link>
        </div>

        <p className="mt-4 text-xs text-fg-faint">
          Tip: add the trading screen to your home screen so you can get back to it in one
          tap during the event.
        </p>
      </Panel>
    );
  }

  if (closed || notOpen) {
    return (
      <Panel className="p-6">
        <h2 className="text-lg font-semibold">
          {closed ? 'This arena has finished' : 'This arena has not opened yet'}
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          {closed
            ? 'Joining is closed, but the final leaderboard is public.'
            : 'The organizer has not opened it for joining. Check back closer to the start time.'}
        </p>
        {closed ? (
          <Link href={`/arenas/${code}/results`} className="btn-secondary mt-5">
            View results
          </Link>
        ) : null}
      </Panel>
    );
  }

  const join = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/arenas/${encodeURIComponent(confirmCode.trim().toUpperCase())}/join`,
        { method: 'POST' },
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? 'Could not join this arena.');
        return;
      }

      router.push(`/arenas/${body.arena.code}/live`);
      router.refresh();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel className="p-6">
      <h2 className="text-lg font-semibold">Join {name}</h2>
      <p className="mt-2 text-sm text-fg-muted">
        You will start with{' '}
        <span className="font-semibold text-fg">
          <Arcs value={startingBalance} decimals={0} />
        </span>{' '}
        in virtual credits. Arcs have no cash value and there is nothing to pay.
      </p>

      <label className="mt-5 block">
        <span className="label">Join code</span>
        <input
          value={confirmCode}
          onChange={(event) => setConfirmCode(event.target.value.toUpperCase())}
          className="field mt-2 text-center font-mono text-xl tracking-[0.35em]"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          aria-label="Join code"
        />
      </label>

      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}

      <button
        type="button"
        onClick={() => void join()}
        disabled={pending || confirmCode.trim().length < 4}
        className="btn-primary mt-5 w-full text-base"
      >
        {pending ? <Spinner /> : null}
        {pending ? 'Joining…' : 'Join arena'}
      </button>
    </Panel>
  );
}
