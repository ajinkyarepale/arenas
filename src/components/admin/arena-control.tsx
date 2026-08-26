'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Leaderboard } from '@/components/arena/leaderboard';
import { RoundTimer } from '@/components/arena/round-timer';
import { Badge, ErrorNote, Panel, Spinner, Stat, StatusPill } from '@/components/ui';
import { useArena } from '@/hooks/use-arena';
import {
  cx,
  formatPoints,
  formatPrice,
  formatProbability,
  formatShares,
  formatTime,
} from '@/lib/format';

/**
 * The organizer's control panel.
 *
 * Everything an organizer needs while standing at the front of a room: the
 * session controls, a live view of every trade and balance, and the escape
 * hatch for when the price feed dies mid-round.
 */

interface AdminArena {
  id: string;
  code: string;
  name: string;
  asset: string;
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'ENDED';
  currentRound: number;
  totalRounds: number;
  roundDurationSec: number;
  lockBufferSec: number;
  startingBalance: number;
  liquidityParamB: number;
  maxStakePerTrade: number;
}

interface AdminRound {
  id: string;
  roundNumber: number;
  status: string;
  openPrice: number | null;
  closePrice: number | null;
  outcome: string | null;
  voidReason: string | null;
  qYes: number;
  qNo: number;
}

interface AdminParticipant {
  id: string;
  name: string;
  email: string;
  balance: number;
  tradeCount: number;
}

interface AdminTrade {
  id: string;
  side: 'YES' | 'NO';
  shares: number;
  cost: number;
  priceAtFill: number;
  payout: number | null;
  trader: string;
  roundNumber: number;
  at: string;
}

interface AdminPayload {
  arena: AdminArena;
  participants: AdminParticipant[];
  rounds: AdminRound[];
  recentTrades: AdminTrade[];
}

export function ArenaControl({ arenaId, code }: { arenaId: string; code: string }) {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  // The public arena feed drives the live numbers; the admin fetch supplies the
  // organizer-only detail (emails, per-participant balances, the trade tape).
  const { round, leaderboard, price, clockOffsetMs, connected } = useArena(code);

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load this arena');
      }
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this arena');
    }
  }, [arenaId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (action: 'start' | 'pause' | 'end' | 'publish') => {
    if (action === 'pause' || action === 'end') {
      const message =
        action === 'pause'
          ? 'Pause the arena? The round in play will be voided and everyone refunded.'
          : 'End the arena for everyone? This cannot be undone.';
      if (!window.confirm(message)) return;
    }

    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'That action failed.');
        return;
      }
      await load();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const forceResolve = async (roundId: string, outcome: 'YES' | 'NO' | 'VOID') => {
    const label =
      outcome === 'VOID'
        ? 'Void this round and refund every trade?'
        : `Force this round to resolve ${outcome}?`;
    if (!window.confirm(label)) return;

    setBusy('resolve');
    setError(null);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId, outcome }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not resolve that round.');
        return;
      }
      await load();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <div className="h-40 animate-pulse rounded-md bg-ink-850" />
        <div className="h-64 animate-pulse rounded-md bg-ink-850" />
      </div>
    );
  }

  const { arena, participants, rounds, recentTrades } = data;
  const activeRound = rounds.find((r) => r.status === 'TRADING' || r.status === 'LOCKED');
  const totalVolume = recentTrades.reduce((sum, t) => sum + t.cost, 0);
  const joinUrl = origin ? `${origin}/arenas/${arena.code}` : `/arenas/${arena.code}`;

  return (
    <div className="flex flex-col gap-6">
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* Session controls */}
      <Panel className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={arena.status} />
              {!connected ? <Badge tone="warn">socket reconnecting</Badge> : null}
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight">{arena.name}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {arena.asset} · round {arena.currentRound} of {arena.totalRounds} · b ={' '}
              {arena.liquidityParamB}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {arena.status === 'DRAFT' ? (
              <button
                type="button"
                onClick={() => void act('publish')}
                disabled={busy !== null}
                className="btn-secondary text-sm"
              >
                {busy === 'publish' ? <Spinner /> : null} Open for joining
              </button>
            ) : null}

            {arena.status !== 'ENDED' ? (
              <button
                type="button"
                onClick={() => void act('end')}
                disabled={busy !== null}
                className="btn-danger text-sm"
              >
                {busy === 'end' ? <Spinner /> : null} End arena
              </button>
            ) : null}
          </div>
        </div>

        {/* Join instructions — what the organizer reads out to the room. */}
        <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[auto_1fr]">
          <div className="rounded border border-accent/40 bg-accent/8 px-5 py-4 text-center">
            <div className="label">Join code</div>
            <div className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-accent">
              {arena.code}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2 text-sm">
            <p className="text-fg-muted">
              Send people to <span className="font-mono text-fg">{joinUrl}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/arenas/${arena.code}/screen`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary !min-h-[38px] text-sm"
              >
                Open big screen ↗
              </Link>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(joinUrl)}
                className="btn-ghost !min-h-[38px] text-sm"
              >
                Copy join link
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Live round */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <RoundTimer round={round} clockOffsetMs={clockOffsetMs} />
            <div className="text-right">
              <div className="label">Implied YES</div>
              <div className="tnum text-4xl font-bold">
                {formatProbability(round?.priceYes ?? 0.5, 1)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <MiniStat label="Live price" value={formatPrice(price?.price)} />
            <MiniStat label="Round open" value={formatPrice(round?.openPrice)} />
            <MiniStat
              label="Round volume"
              value={`${formatPoints(round?.volume ?? 0, 0)} pts`}
            />
          </div>

          {activeRound ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="label mb-2">
                Force-resolve round {activeRound.roundNumber}
              </div>
              <p className="mb-3 text-xs text-fg-faint">
                Use this only if the price feed has failed. Voiding refunds every trade in
                the round.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void forceResolve(activeRound.id, 'YES')}
                  disabled={busy !== null}
                  className="btn !min-h-[40px] border border-yes/40 bg-yes/10 px-4 text-sm font-semibold text-yes"
                >
                  Resolve YES
                </button>
                <button
                  type="button"
                  onClick={() => void forceResolve(activeRound.id, 'NO')}
                  disabled={busy !== null}
                  className="btn !min-h-[40px] border border-no/40 bg-no/10 px-4 text-sm font-semibold text-no"
                >
                  Resolve NO
                </button>
                <button
                  type="button"
                  onClick={() => void forceResolve(activeRound.id, 'VOID')}
                  disabled={busy !== null}
                  className="btn !min-h-[40px] border border-warn/40 bg-warn/10 px-4 text-sm font-semibold text-warn"
                >
                  Void &amp; refund
                </button>
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="label">Leaderboard</span>
            <span className="text-xs text-fg-faint">{participants.length} joined</span>
          </div>
          <Leaderboard data={leaderboard} limit={8} />
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Participants" value={participants.length} />
        <Stat
          label="Rounds settled"
          value={rounds.filter((r) => r.status === 'RESOLVED').length}
        />
        <Stat label="Recent volume" value={`${formatPoints(totalVolume, 0)} pts`} />
        <Stat
          label="Points in play"
          value={formatPoints(
            participants.reduce((sum, p) => sum + p.balance, 0),
            0,
          )}
        />
      </div>

      {/* Trade tape */}
      <Panel>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="label">Live trade tape</span>
          <span className="text-xs text-fg-faint">last {recentTrades.length}</span>
        </div>
        {recentTrades.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-muted">
            No trades yet.
          </p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="sticky top-0 bg-ink-850">
                <tr className="border-b border-line text-left">
                  <Th>Time</Th>
                  <Th>Trader</Th>
                  <Th>R</Th>
                  <Th>Side</Th>
                  <Th className="text-right">Shares</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Fill</Th>
                  <Th className="text-right">Payout</Th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-line last:border-0">
                    <Td className="tnum text-fg-faint">{formatTime(trade.at)}</Td>
                    <Td className="max-w-[8rem] truncate font-medium">{trade.trader}</Td>
                    <Td className="tnum text-fg-faint">{trade.roundNumber}</Td>
                    <Td>
                      <Badge tone={trade.side === 'YES' ? 'yes' : 'no'}>{trade.side}</Badge>
                    </Td>
                    <Td className="tnum text-right">{formatShares(trade.shares)}</Td>
                    <Td className="tnum text-right">{formatPoints(trade.cost)}</Td>
                    <Td className="tnum text-right text-fg-muted">
                      {formatProbability(trade.priceAtFill)}
                    </Td>
                    <Td
                      className={cx(
                        'tnum text-right',
                        trade.payout === null
                          ? 'text-fg-faint'
                          : trade.payout > trade.cost
                            ? 'text-yes'
                            : 'text-no',
                      )}
                    >
                      {trade.payout === null ? '—' : formatPoints(trade.payout)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Rounds */}
      <Panel>
        <div className="border-b border-line px-5 py-3">
          <span className="label">Rounds</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>#</Th>
                <Th>Status</Th>
                <Th>Open</Th>
                <Th>Close</Th>
                <Th>Outcome</Th>
                <Th className="text-right">qYes / qNo</Th>
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 ? (
                <tr>
                  <Td className="py-6 text-center text-fg-muted">
                    No rounds have opened yet.
                  </Td>
                </tr>
              ) : (
                rounds.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <Td className="tnum font-semibold">{r.roundNumber}</Td>
                    <Td className="text-fg-muted">{r.status}</Td>
                    <Td className="tnum text-fg-muted">{formatPrice(r.openPrice)}</Td>
                    <Td className="tnum text-fg-muted">{formatPrice(r.closePrice)}</Td>
                    <Td>
                      {r.outcome ? (
                        <Badge
                          tone={
                            r.outcome === 'VOID' ? 'warn' : r.outcome === 'YES' ? 'yes' : 'no'
                          }
                        >
                          {r.outcome}
                        </Badge>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                      {r.voidReason ? (
                        <div className="mt-1 text-[11px] text-fg-faint">{r.voidReason}</div>
                      ) : null}
                    </Td>
                    <Td className="tnum text-right text-fg-faint">
                      {r.qYes.toFixed(1)} / {r.qNo.toFixed(1)}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Participants */}
      <Panel>
        <div className="border-b border-line px-5 py-3">
          <span className="label">Participants</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th className="text-right">Trades</Th>
                <Th className="text-right">Balance</Th>
                <Th className="text-right">P/L</Th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <Td className="py-6 text-center text-fg-muted">Nobody has joined yet.</Td>
                </tr>
              ) : (
                participants.map((p) => {
                  const pnl = p.balance - arena.startingBalance;
                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <Td className="font-medium">{p.name}</Td>
                      <Td className="text-fg-faint">{p.email}</Td>
                      <Td className="tnum text-right text-fg-muted">{p.tradeCount}</Td>
                      <Td className="tnum text-right font-semibold">
                        {formatPoints(p.balance)}
                      </Td>
                      <Td
                        className={cx(
                          'tnum text-right',
                          pnl > 0 ? 'text-yes' : pnl < 0 ? 'text-no' : 'text-fg-muted',
                        )}
                      >
                        {pnl >= 0 ? '+' : '−'}
                        {formatPoints(Math.abs(pnl))}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label !text-[10px]">{label}</div>
      <div className="tnum mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cx(
        'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-faint',
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cx('px-4 py-2.5', className)}>{children}</td>;
}
