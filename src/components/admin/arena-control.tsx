'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Leaderboard } from '@/components/arena/leaderboard';
import { RoundTimer } from '@/components/arena/round-timer';
import { ArenaShareModal } from '@/components/arena/arena-share-modal';
import { useArena } from '@/hooks/use-arena';
import {
  cx,
  formatDateTime,
  formatDuration,
  formatPoints,
  formatPrice,
  formatProbability,
  formatShares,
  formatTime,
} from '@/lib/format';

interface AdminArena {
  id: string;
  code: string;
  name: string;
  asset: string;
  marketCategory?: 'CRYPTO_PRICE' | 'CAMPUS_EVENT' | 'CUSTOM_TRIVIA';
  question?: string | null;
  resolutionCriteria?: string | null;
  isManualResolution?: boolean;
  collegeName?: string | null;
  enableBots?: boolean;
  botsEnabled?: boolean;
  botStartingBalance?: number;
  botMaxExposure?: number;
  botStrategy?: string;
  botStatus?: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  botLastTradeAt?: string | null;
  mode?: string;
  demoStatus?: string;
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'ENDED';
  resolvedOutcome?: 'YES' | 'NO' | 'VOID' | null;
  resolvedAt?: string | null;
  tradesPerMinuteLimit?: number;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
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
  question?: string | null;
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
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const { round, price, connected, clockOffsetMs } = useArena(code);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not load management data.');
        return;
      }
      const json: AdminPayload = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Network error loading management data.');
    }
  }, [arenaId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 4000);
    return () => clearInterval(interval);
  }, [load]);

  const act = async (action: 'publish' | 'start-round' | 'pause' | 'resume' | 'end') => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, {
        method: 'PATCH',
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

  const handleResolve = async (outcome: 'YES' | 'NO' | 'VOID', roundId?: string) => {
    const roundLabel = roundId ? 'active round' : 'entire arena';
    if (
      !window.confirm(
        `Are you sure you want to declare "${outcome}" as the winning outcome for the ${roundLabel}? This will settle all held shares and update balances.`,
      )
    ) {
      return;
    }

    setBusy(`resolve-${outcome}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          outcome,
          roundId: roundId || undefined,
          resolveArena: !roundId,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Failed to resolve market.');
        return;
      }
      await load();
    } catch {
      setError('Network error resolving market.');
    } finally {
      setBusy(null);
    }
  };

  const updateSubmissionRule = async (tradesPerMinuteLimit: number) => {
    setBusy('update-rules');
    setError(null);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'update-rules', tradesPerMinuteLimit }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not update submission rule.');
        return;
      }
      await load();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const deleteArena = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete arena "${data?.arena.name}"? This will delete all its rounds, trades, and participant history. This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy('delete');
    setError(null);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not delete arena.');
        setBusy(null);
        return;
      }
      window.location.href = '/admin';
    } catch {
      setError('Network error while deleting arena.');
      setBusy(null);
    }
  };

  const botControl = async (action: 'PAUSE' | 'RESUME' | 'STOP') => {
    setBusy('bot');
    setError(null);
    try {
      const res = await fetch(`/api/arenas/${data?.arena.code}/bot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not update bot state.');
        return;
      }
      await load();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const demoControl = async (action: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET') => {
    setBusy('demo');
    setError(null);
    try {
      const res = await fetch(`/api/arenas/${data?.arena.code}/demo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not update demo state.');
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
      <div className="flex flex-col gap-4">
        {error ? (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm">
            {error}
          </div>
        ) : null}
        <div className="h-44 animate-pulse rounded-xl border border-[#27272A] bg-[#201f1f]/50" />
        <div className="h-64 animate-pulse rounded-xl border border-[#27272A] bg-[#201f1f]/50" />
      </div>
    );
  }

  const { arena, participants, rounds, recentTrades } = data;
  const activeRound = rounds.find((r) => r.status === 'TRADING' || r.status === 'LOCKED');
  const isCustomMarket = arena.marketCategory !== 'CRYPTO_PRICE';
  const totalVolume = recentTrades.reduce((sum, t) => sum + t.cost, 0);
  const joinUrl = origin ? `${origin}/arenas/${arena.code}` : `/arenas/${arena.code}`;

  return (
    <div className="flex flex-col gap-6 font-['Geist'] text-[#e5e2e1]">
      {error ? (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm">
          {error}
        </div>
      ) : null}

      {/* Main Session Control Card */}
      <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {arena.status === 'LIVE' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 font-['Epilogue'] text-[11px] font-bold text-[#22C55E] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" /> LIVE NOW
                </span>
              ) : arena.status === 'LOBBY' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-[#EAB308]/10 border border-[#EAB308]/20 font-['Epilogue'] text-[11px] font-bold text-[#EAB308]">
                  LOBBY (UPCOMING)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">
                  FINISHED
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold uppercase bg-[#201f1f] text-[#c4c7c8] border border-[#27272A]">
                {isCustomMarket ? 'Custom Event Market' : 'Crypto Oracle'}
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase bg-[#201f1f] border border-[#27272A] px-2.5 py-0.5 rounded-full">
                {arena.code}
              </span>
              {!connected && (
                <span className="px-2 py-0.5 rounded-full bg-[#EAB308]/10 border border-[#EAB308]/30 font-['Epilogue'] text-[10px] text-[#EAB308]">
                  Socket reconnecting...
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">{arena.name}</h2>
            {isCustomMarket && arena.question && (
              <p className="font-['Geist'] text-sm font-semibold text-[#f4f4f5] bg-[#27272A]/40 p-3 rounded-lg border border-[#27272A]">
                {arena.question}
              </p>
            )}
            <p className="font-['Epilogue'] text-xs text-[#c4c7c8] flex items-center gap-2">
              <span>{isCustomMarket ? 'Custom Questions' : arena.asset}</span>
              <span>·</span>
              <span>Round {arena.currentRound} of {arena.totalRounds}</span>
              <span>·</span>
              <span>Starting: {formatPoints(arena.startingBalance)}</span>
              <span>·</span>
              <span>Timer: {formatDuration(arena.roundDurationSec)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {arena.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => void act('publish')}
                disabled={busy !== null}
                className="bg-white text-[#2f3131] font-['Epilogue'] text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#c6c6c7] transition-all shadow"
              >
                {busy === 'publish' ? 'Opening...' : 'Open for Joining'}
              </button>
            )}

            {arena.status === 'LOBBY' && (
              <button
                type="button"
                onClick={() => void act('start-round')}
                disabled={busy !== null}
                className="bg-[#22C55E] text-black font-['Epilogue'] text-xs font-bold px-6 py-2.5 rounded-full hover:bg-[#1ea750] transition-all shadow-lg flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>{busy === 'start-round' ? 'Starting...' : 'Start Round 1 (Open Trading)'}</span>
              </button>
            )}

            {arena.status === 'LIVE' && (
              <button
                type="button"
                onClick={() => void act('end')}
                disabled={busy !== null}
                className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-950/40 px-4 py-2 rounded-full font-['Epilogue'] text-xs font-bold transition-all"
              >
                {busy === 'end' ? 'Ending...' : 'End Arena'}
              </button>
            )}

            <button
              type="button"
              onClick={deleteArena}
              disabled={busy !== null}
              className="border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 px-4 py-2 rounded-full font-['Epilogue'] text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>{busy === 'delete' ? 'Deleting...' : 'Delete Arena'}</span>
            </button>
          </div>
        </div>

        {/* Organizer-Controlled Submission Rule (Configured Before Round Starts) */}
        {(arena.status === 'LOBBY' || arena.status === 'DRAFT') && (
          <div className="border-t border-[#27272A] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] p-4 rounded-xl border border-[#27272A]">
            <div className="flex flex-col gap-0.5">
              <div className="font-['Epilogue'] text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#22C55E]">tune</span>
                <span>Participant Submission Rule</span>
              </div>
              <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                Decide how participants can submit YES/NO trades (configured before starting round).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="submissionRuleSelect" className="font-['Epilogue'] text-xs text-[#c4c7c8] whitespace-nowrap">
                Allowed Trades:
              </label>
              <select
                id="submissionRuleSelect"
                value={arena.tradesPerMinuteLimit ?? 0}
                disabled={busy !== null}
                onChange={(e) => void updateSubmissionRule(Number(e.target.value))}
                className="bg-[#201f1f] text-white border border-[#27272A] rounded-lg px-3 py-2 text-xs font-['Epilogue'] font-medium focus:outline-none focus:border-[#22C55E] cursor-pointer"
              >
                <option value="0">No Limit (while balance &gt; 0)</option>
                <option value="5">5 trades per minute</option>
                <option value="10">10 trades per minute</option>
                <option value="15">15 trades per minute</option>
                <option value="20">20 trades per minute</option>
                <option value="30">30 trades per minute</option>
                <option value="60">60 trades per minute</option>
              </select>
            </div>
          </div>
        )}

        {/* Join instructions & Short Code banner */}
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 border-t border-[#27272A] pt-5 items-center">
          <div className="bg-[#141414] border border-[#27272A] rounded-xl px-6 py-4 text-center">
            <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider">
              JOIN CODE
            </div>
            <div className="font-mono text-3xl font-bold tracking-[0.2em] text-[#22C55E] mt-1">
              {arena.code}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="font-['Geist'] text-xs text-[#c4c7c8]">
              Share with participants:{' '}
              <span className="font-mono text-white" suppressHydrationWarning>{joinUrl}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#22C55E]">qr_code_2</span>
                <span>Show QR Code &amp; Share</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(joinUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {}
                }}
                className="px-4 py-2 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#c4c7c8] hover:text-white transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] text-[#22C55E]">check</span>
                    <span>Copied to clipboard!</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">link</span>
                    <span>Copy Join Link</span>
                  </>
                )}
              </button>
              <Link
                href={`/arenas/${arena.code}/screen`}
                target="_blank"
                className="px-4 py-2 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#c4c7c8] hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Projector Big Screen ↗</span>
              </Link>
              <a
                href={`/api/admin/arenas/${arena.id}/export`}
                download
                className="px-4 py-2 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#c4c7c8] hover:text-white transition-colors flex items-center gap-1.5"
                title="Download CSV standings of all participants"
              >
                <span className="material-symbols-outlined text-[15px] text-[#22C55E]">download</span>
                <span>Export Standings (CSV)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Audit Timestamps in IST (GMT+5:30) */}
        <div className="border-t border-[#27272A] pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 font-['Epilogue'] text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#c4c7c8] uppercase">CREATED (IST)</span>
            <span className="text-white font-medium">{formatDateTime(arena.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#c4c7c8] uppercase">STARTED (IST)</span>
            <span className="text-white font-medium">
              {arena.startedAt ? formatDateTime(arena.startedAt) : 'Not started'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#c4c7c8] uppercase">ENDED (IST)</span>
            <span className="text-white font-medium">
              {arena.endsAt ? formatDateTime(arena.endsAt) : 'In progress'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#c4c7c8] uppercase">PRICE ORACLE</span>
            <span className="text-white font-medium">
              {isCustomMarket ? "Organizer 1-Click Settlement" : "Binance TWAP Automated"}
            </span>
          </div>
        </div>
      </div>

      {/* Automated Liquidity Bot Panel */}
      {(arena.botsEnabled || arena.enableBots) && (
        <div className="bg-[rgba(20,20,20,0.85)] border border-[#27272A] border-l-4 border-l-[#22C55E] backdrop-blur-xl rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Geist'] text-base font-bold text-white flex items-center gap-2">
                🤖 Automated Liquidity Bot
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider ${
                  arena.botStatus === 'ACTIVE'
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                    : arena.botStatus === 'PAUSED'
                    ? 'bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                {arena.botStatus ?? 'ACTIVE'}
              </span>
            </div>
            <p className="font-['Epilogue'] text-xs text-[#a1a1aa] flex flex-wrap items-center gap-2">
              <span>Strategy: <strong className="text-white">{arena.botStrategy ?? 'BALANCED'}</strong></span>
              <span>·</span>
              <span>Max Exposure: <strong className="text-white font-mono">{formatPoints(arena.botMaxExposure ?? 500)}</strong></span>
              <span>·</span>
              <span>Starting Balance: <strong className="text-white font-mono">{formatPoints(arena.botStartingBalance ?? 1000)}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {arena.botStatus === 'PAUSED' && (
              <button
                type="button"
                onClick={() => void botControl('RESUME')}
                disabled={busy !== null}
                className="bg-[#22C55E] text-black font-['Epilogue'] text-xs font-bold px-4 py-2 rounded-full hover:bg-[#1ea750] transition-all shadow flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>{busy === 'bot' ? 'Updating...' : 'Resume Bot'}</span>
              </button>
            )}

            {arena.botStatus !== 'PAUSED' && arena.botStatus !== 'STOPPED' && (
              <button
                type="button"
                onClick={() => void botControl('PAUSE')}
                disabled={busy !== null}
                className="bg-[#201f1f] text-white border border-[#27272A] hover:bg-[#2e2e33] font-['Epilogue'] text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">pause</span>
                <span>{busy === 'bot' ? 'Updating...' : 'Pause Bot'}</span>
              </button>
            )}

            {arena.botStatus !== 'STOPPED' && (
              <button
                type="button"
                onClick={() => void botControl('STOP')}
                disabled={busy !== null}
                className="border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 px-4 py-2 rounded-full font-['Epilogue'] text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">stop</span>
                <span>{busy === 'bot' ? 'Updating...' : 'Stop Bot'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Demo Simulation Controller Panel */}
      {arena.mode === 'DEMO' && (
        <div className="bg-[rgba(20,20,20,0.85)] border border-[#27272A] border-l-4 border-l-[#3b82f6] backdrop-blur-xl rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Geist'] text-base font-bold text-white flex items-center gap-2">
                🎮 Demo Room Controller (60 Virtual Traders)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider ${
                  arena.demoStatus === 'ACTIVE'
                    ? 'bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30'
                    : arena.demoStatus === 'PAUSED'
                    ? 'bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30'
                    : 'bg-[#27272A] text-[#a1a1aa] border border-[#3f3f46]'
                }`}
              >
                {arena.demoStatus ?? 'STOPPED'}
              </span>
            </div>
            <p className="font-['Epilogue'] text-xs text-[#a1a1aa]">
              Simulates concurrent crowd trading across 7 strategies (Momentum, Contrarian, Large/Small, Balanced).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {arena.demoStatus === 'ACTIVE' ? (
              <button
                type="button"
                onClick={() => void demoControl('PAUSE')}
                disabled={busy !== null}
                className="bg-[#201f1f] text-white border border-[#27272A] hover:bg-[#2e2e33] font-['Epilogue'] text-xs font-bold px-4 py-2 rounded-full transition-all"
              >
                {busy === 'demo' ? 'Updating...' : 'Pause Demo'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void demoControl('START')}
                disabled={busy !== null}
                className="bg-[#3b82f6] text-white font-['Epilogue'] text-xs font-bold px-4 py-2 rounded-full hover:bg-[#2563eb] transition-all shadow"
              >
                {busy === 'demo' ? 'Starting...' : 'Run Demo Simulation'}
              </button>
            )}

            <button
              type="button"
              onClick={() => void demoControl('RESET')}
              disabled={busy !== null}
              className="border border-[#3f3f46] bg-[#201f1f] text-[#c4c7c8] hover:text-white px-4 py-2 rounded-full font-['Epilogue'] text-xs font-bold transition-all"
            >
              Reset Room
            </button>
          </div>
        </div>
      )}

      {/* 1-Click Settlement Card for Custom Markets only */}
      {isCustomMarket && (
        <div className="bg-[rgba(20,20,20,0.85)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
              <h3 className="font-['Geist'] text-base font-bold text-white">
                Declare Winning Outcome
              </h3>
            </div>
            <span className="text-[11px] font-['Epilogue'] text-[#a1a1aa]">
              {activeRound ? `Round ${activeRound.roundNumber} (${activeRound.status})` : 'Tournament Level'}
            </span>
          </div>

          <div className="p-3.5 bg-[#18181b] rounded-xl border border-[#27272a] flex flex-col gap-1">
            <span className="text-[10px] font-['Epilogue'] font-bold text-[#a1a1aa] uppercase tracking-wider">
              Active Prediction Question
            </span>
            <p className="font-['Geist'] text-sm font-semibold text-white">
              {activeRound?.question || arena.question || `${arena.name} — Final Outcome`}
            </p>
            {arena.resolutionCriteria && (
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                <strong className="text-[#d4d4d8]">Criteria:</strong> {arena.resolutionCriteria}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <span className="text-xs text-[#a1a1aa] font-['Epilogue'] whitespace-nowrap">
              Declare Outcome:
            </span>
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleResolve('YES', activeRound?.id)}
                className="py-3 px-4 rounded-xl bg-[#22C55E] hover:bg-[#1ea750] text-black font-['Epilogue'] text-xs font-bold transition-all shadow-md shadow-[#22C55E]/10 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>{busy === 'resolve-YES' ? 'Settling…' : 'Declare YES Won'}</span>
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleResolve('NO', activeRound?.id)}
                className="py-3 px-4 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-['Epilogue'] text-xs font-bold transition-all shadow-md shadow-[#ef4444]/10 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>{busy === 'resolve-NO' ? 'Settling…' : 'Declare NO Won'}</span>
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleResolve('VOID', activeRound?.id)}
                className="py-3 px-4 rounded-xl bg-[#27272A] hover:bg-[#3f3f46] text-[#e4e4e7] border border-[#3f3f46] font-['Epilogue'] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">block</span>
                <span>{busy === 'resolve-VOID' ? 'Refunding…' : 'VOID (Refund)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ArenaShareModal
          code={arena.code}
          name={arena.name}
          isOpen={true}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Live Round Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <RoundTimer round={round} clockOffsetMs={clockOffsetMs} />
            <div className="text-right">
              <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase">IMPLIED YES</div>
              <div className="font-['Geist'] text-4xl font-bold text-[#22C55E]">
                {formatProbability(round?.priceYes ?? 0.5, 1)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-[#27272A] pt-4 font-['Epilogue'] text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#c4c7c8] uppercase block">LIVE PRICE</span>
              <span className="text-white font-bold">{formatPrice(price?.price)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#c4c7c8] uppercase block">ROUND OPEN</span>
              <span className="text-white font-bold">{formatPrice(round?.openPrice)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#c4c7c8] uppercase block">ROUND VOLUME</span>
              <span className="text-white font-bold">{formatPoints(round?.volume ?? 0, 0)} pts</span>
            </div>
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-['Geist'] text-base font-bold text-white">Live Leaderboard</h3>
            <span className="font-['Epilogue'] text-xs text-[#c4c7c8]">
              {participants.length} joined
            </span>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-xs text-[#c4c7c8] py-8 text-center">No participants joined yet.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center py-2 px-3 rounded-lg bg-[#141414] border border-[#27272A] font-['Epilogue'] text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#201f1f] text-center text-[#c4c7c8] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-white font-medium">{p.name || p.email}</span>
                    </div>
                    <span className="font-bold text-[#22C55E]">{formatPoints(p.balance, 0)} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Trades Table */}
      <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="font-['Geist'] text-base font-bold text-white">Recent Predictions &amp; Orders</h3>
          <span className="font-['Epilogue'] text-xs text-[#c4c7c8]">
            {recentTrades.length} total orders
          </span>
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-10 border border-[#27272A]/50 rounded-lg bg-[#141414]">
            <p className="text-xs text-[#c4c7c8]">No predictions placed in this arena yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-['Epilogue'] text-xs">
              <thead>
                <tr className="border-b border-[#27272A] text-[#c4c7c8]">
                  <th className="pb-3 font-bold uppercase">TIME</th>
                  <th className="pb-3 font-bold uppercase">TRADER</th>
                  <th className="pb-3 font-bold uppercase">ROUND</th>
                  <th className="pb-3 font-bold uppercase">PREDICTION</th>
                  <th className="pb-3 font-bold uppercase text-right">SHARES</th>
                  <th className="pb-3 font-bold uppercase text-right">STAKE</th>
                  <th className="pb-3 font-bold uppercase text-right">PRICE</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-[#27272A]/50 hover:bg-[#201f1f]/30 transition-colors">
                    <td className="py-2.5 text-[#c4c7c8]">{formatTime(t.at)}</td>
                    <td className="py-2.5 font-medium text-white">{t.trader}</td>
                    <td className="py-2.5 text-[#c4c7c8]">R{t.roundNumber}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.side === 'YES'
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                            : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono">{formatShares(t.shares)}</td>
                    <td className="py-2.5 text-right font-medium text-white">{formatPoints(t.cost, 0)} pts</td>
                    <td className="py-2.5 text-right font-mono">{Math.round(t.priceAtFill * 100)}¢</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
