'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface ArenaStatusTarget {
  id: string;
  code: string;
  name: string;
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED';
  marketCategory?: string;
  question?: string | null;
  resolvedOutcome?: 'YES' | 'NO' | 'VOID' | null;
  totalRounds?: number;
  currentRound?: number;
  host?: string;
}

interface ArenaStatusModalProps {
  arena: ArenaStatusTarget;
  isOpen: boolean;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onStatusChange?: (
    newStatus: 'DRAFT' | 'LOBBY' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED',
    resolvedOutcome?: 'YES' | 'NO' | 'VOID' | null,
  ) => void;
}

export function ArenaStatusModal({
  arena,
  isOpen,
  isSuperAdmin = false,
  onClose,
  onStatusChange,
}: ArenaStatusModalProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetStatus = async (
    targetStatus: 'DRAFT' | 'LOBBY' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED',
  ) => {
    setBusy(targetStatus);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/arenas/${arena.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Failed to update status to ${targetStatus}`);
      }

      setSuccess(`Status changed to ${targetStatus}`);
      onStatusChange?.(targetStatus);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(null);
    }
  };

  const handleResolveOutcome = async (outcome: 'YES' | 'NO' | 'VOID') => {
    const confirmMsg = `Declare "${outcome}" as winning outcome? This will settle all trades and mark the arena as ENDED.`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(`resolve-${outcome}`);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/arenas/${arena.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, resolveArena: true }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Failed to resolve as ${outcome}`);
      }

      setSuccess(`Arena successfully resolved as ${outcome}`);
      onStatusChange?.('ENDED', outcome);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setBusy(null);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    LIVE: { bg: 'bg-[#22C55E]/15', text: 'text-[#22C55E]', border: 'border-[#22C55E]/30' },
    LOBBY: { bg: 'bg-[#EAB308]/15', text: 'text-[#EAB308]', border: 'border-[#EAB308]/30' },
    PAUSED: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    ENDED: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },
    DRAFT: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
    ARCHIVED: { bg: 'bg-zinc-700/20', text: 'text-zinc-400', border: 'border-zinc-700/40' },
  };

  const currentTheme = statusColors[arena.status] || statusColors.LOBBY;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#18181b] border border-[#27272A] rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-white font-['Geist'] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-['Epilogue'] text-[10px] font-bold text-white uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A]">
                Arena Controls
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase bg-[#201f1f] border border-[#27272A] px-2.5 py-0.5 rounded-full">
                {arena.code}
              </span>
              <span
                className={`font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border} flex items-center gap-1.5`}
              >
                {arena.status === 'LIVE' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                )}
                {arena.status}
              </span>
            </div>
            <h3 className="font-['Geist'] text-xl font-bold text-white tracking-tight mt-1">
              {arena.name}
            </h3>
            {arena.question && (
              <p className="text-xs text-[#a1a1aa] bg-[#141414] p-2.5 rounded-lg border border-[#27272A]">
                {arena.question}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#27272A]/50 hover:bg-[#27272A] flex items-center justify-center text-[#c4c7c8] hover:text-white transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Feedback Notes */}
        {error && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        {/* Status Transition Actions */}
        <div className="flex flex-col gap-2.5">
          <label className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase tracking-wider">
            Change Arena Status
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* GO LIVE */}
            <button
              type="button"
              disabled={busy !== null || arena.status === 'LIVE'}
              onClick={() => handleSetStatus('LIVE')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                arena.status === 'LIVE'
                  ? 'border-[#22C55E]/40 bg-[#22C55E]/10 opacity-60 cursor-default'
                  : 'border-[#27272A] bg-[#201f1f] hover:border-[#22C55E]/50 hover:bg-[#22C55E]/5'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E] shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              </div>
              <div>
                <div className="font-['Epilogue'] text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Start Live Trading</span>
                  {arena.status === 'LIVE' && (
                    <span className="text-[10px] text-[#22C55E]">(Current)</span>
                  )}
                </div>
                <p className="font-['Geist'] text-[11px] text-[#a1a1aa] mt-0.5">
                  Opens prediction round and enables realtime participant orders.
                </p>
              </div>
            </button>

            {/* LOBBY */}
            <button
              type="button"
              disabled={busy !== null || arena.status === 'LOBBY'}
              onClick={() => handleSetStatus('LOBBY')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                arena.status === 'LOBBY'
                  ? 'border-[#EAB308]/40 bg-[#EAB308]/10 opacity-60 cursor-default'
                  : 'border-[#27272A] bg-[#201f1f] hover:border-[#EAB308]/50 hover:bg-[#EAB308]/5'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAB308]/10 border border-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">door_front</span>
              </div>
              <div>
                <div className="font-['Epilogue'] text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Move to Lobby</span>
                  {arena.status === 'LOBBY' && (
                    <span className="text-[10px] text-[#EAB308]">(Current)</span>
                  )}
                </div>
                <p className="font-['Geist'] text-[11px] text-[#a1a1aa] mt-0.5">
                  Allows attendees to join with code/QR before match launch.
                </p>
              </div>
            </button>

            {/* PAUSE */}
            <button
              type="button"
              disabled={busy !== null || arena.status === 'PAUSED'}
              onClick={() => handleSetStatus('PAUSED')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                arena.status === 'PAUSED'
                  ? 'border-amber-500/40 bg-amber-500/10 opacity-60 cursor-default'
                  : 'border-[#27272A] bg-[#201f1f] hover:border-amber-500/50 hover:bg-amber-500/5'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">pause</span>
              </div>
              <div>
                <div className="font-['Epilogue'] text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Pause Trading</span>
                  {arena.status === 'PAUSED' && (
                    <span className="text-[10px] text-amber-400">(Current)</span>
                  )}
                </div>
                <p className="font-['Geist'] text-[11px] text-[#a1a1aa] mt-0.5">
                  Halts predictions and clocks temporarily during presentations.
                </p>
              </div>
            </button>

            {/* END */}
            <button
              type="button"
              disabled={busy !== null || arena.status === 'ENDED'}
              onClick={() => handleSetStatus('ENDED')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                arena.status === 'ENDED'
                  ? 'border-slate-500/40 bg-slate-500/10 opacity-60 cursor-default'
                  : 'border-[#27272A] bg-[#201f1f] hover:border-red-500/40 hover:bg-red-950/20'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">stop</span>
              </div>
              <div>
                <div className="font-['Epilogue'] text-xs font-bold text-white flex items-center gap-1.5">
                  <span>End Arena</span>
                  {arena.status === 'ENDED' && (
                    <span className="text-[10px] text-slate-400">(Current)</span>
                  )}
                </div>
                <p className="font-['Geist'] text-[11px] text-[#a1a1aa] mt-0.5">
                  Concludes tournament and prepares final leaderboard ranking.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 1-Click Outcome Settlement (When concluding or custom question) */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[#27272A]">
          <div className="flex items-center justify-between">
            <label className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase tracking-wider flex items-center gap-1.5">
              <span>Declare Winning Outcome</span>
              {arena.resolvedOutcome && (
                <span className="text-[#22C55E] normal-case">
                  (Currently: {arena.resolvedOutcome})
                </span>
              )}
            </label>
            <span className="text-[10px] text-[#8e9192]">1-Click Settle &amp; Payout</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleResolveOutcome('YES')}
              className="py-2.5 px-3 rounded-xl bg-[#22C55E]/15 hover:bg-[#22C55E] text-[#22C55E] hover:text-black border border-[#22C55E]/30 font-['Epilogue'] text-xs font-bold transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>YES Won</span>
            </button>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleResolveOutcome('NO')}
              className="py-2.5 px-3 rounded-xl bg-[#ef4444]/15 hover:bg-[#ef4444] text-[#ef4444] hover:text-white border border-[#ef4444]/30 font-['Epilogue'] text-xs font-bold transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
              <span>NO Won</span>
            </button>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleResolveOutcome('VOID')}
              className="py-2.5 px-3 rounded-xl bg-[#201f1f] hover:bg-[#27272A] text-[#c4c7c8] hover:text-white border border-[#27272A] font-['Epilogue'] text-xs font-bold transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">block</span>
              <span>VOID (Refund)</span>
            </button>
          </div>
        </div>

        {/* Superadmin Archive Option */}
        {isSuperAdmin && (
          <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
            <span className="text-xs text-[#a1a1aa] font-['Geist']">
              Super Admin: {arena.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'} arena from public catalog
            </span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleSetStatus(arena.status === 'ARCHIVED' ? 'ENDED' : 'ARCHIVED')}
              className="px-3 py-1.5 rounded-lg border border-[#3f3f46] text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white hover:bg-[#27272A] transition-colors"
            >
              {arena.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        )}

        {/* Quick Navigation Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#27272A]">
          <Link
            href={`/admin/arenas/${arena.code}`}
            className="text-xs font-['Epilogue'] text-[#c4c7c8] hover:text-white underline flex items-center gap-1 transition-colors"
          >
            <span>Full Control Panel</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </Link>

          <Link
            href={arena.status === 'ENDED' ? `/arenas/${arena.code}/results` : `/arenas/${arena.code}`}
            className="px-4 py-2 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow"
          >
            Open Arena View →
          </Link>
        </div>
      </div>
    </div>
  );
}
