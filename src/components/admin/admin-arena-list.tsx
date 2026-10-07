'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ArenaShareModal } from '@/components/arena/arena-share-modal';

export interface AdminArenaSummary {
  id: string;
  code: string;
  name: string;
  asset: string;
  totalRounds: number;
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED';
  resolvedOutcome: 'YES' | 'NO' | 'VOID' | null;
  resolvedAt: string | null;
  createdAt: string;
  participantCount: number;
  predictionCount: number;
  endsAt: string | null;
}

export function AdminArenaList({
  arenas: initialArenas,
  isSuperAdmin = false,
}: {
  arenas: AdminArenaSummary[];
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [arenas, setArenas] = useState(initialArenas);
  const [shareArena, setShareArena] = useState<{ code: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleDelete = async (arenaId: string, arenaName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${arenaName}"? This will delete all its rounds, trades, and participant history. This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(arenaId);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? 'Could not delete arena');
        return;
      }
      setArenas((prev) => prev.filter((a) => a.id !== arenaId));
      router.refresh();
    } catch {
      alert('Network error while deleting arena');
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchive = async (arenaId: string, arenaName: string, currentStatus: string) => {
    const isArchiving = currentStatus !== 'ARCHIVED';
    const confirmMsg = isArchiving
      ? `Archive "${arenaName}"? Users will no longer be able to view or join this arena. Only a superadmin can unarchive it.`
      : `Unarchive "${arenaName}"? It will be restored to ENDED status and become visible again.`;

    if (!window.confirm(confirmMsg)) return;

    setArchivingId(arenaId);
    try {
      const res = await fetch(`/api/admin/arenas/${arenaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isArchiving ? 'archive' : 'unarchive' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? `Could not ${isArchiving ? 'archive' : 'unarchive'} arena`);
        return;
      }
      // Optimistically update status in the list
      setArenas((prev) =>
        prev.map((a) =>
          a.id === arenaId ? { ...a, status: isArchiving ? 'ARCHIVED' : 'ENDED' } : a,
        ),
      );
      router.refresh();
    } catch {
      alert(`Network error while ${isArchiving ? 'archiving' : 'unarchiving'} arena`);
    } finally {
      setArchivingId(null);
    }
  };

  if (arenas.length === 0) {
    return (
      <div className="rounded-xl border border-[#27272A] bg-[#201f1f]/40 p-12 text-center flex flex-col items-center">
        <h3 className="font-['Geist'] text-lg font-bold text-white">No arenas hosted yet</h3>
        <p className="text-sm text-[#c4c7c8] mt-1 max-w-sm">
          Click New Arena above to create your first live prediction market tournament.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {arenas.map((arena) => {
        const isArchived = arena.status === 'ARCHIVED';
        const isResolved = arena.status === 'ENDED' && arena.resolvedOutcome !== null;
        const isAwaitingResolution = arena.status === 'ENDED' && arena.resolvedOutcome === null;

        return (
          <div
            key={arena.id}
            className={`border rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-colors backdrop-blur-md ${
              isArchived
                ? 'bg-slate-100/80 border-slate-200 dark:bg-[rgba(15,15,15,0.5)] dark:border-[#1e1e1e] opacity-75'
                : 'bg-white dark:bg-[rgba(20,20,20,0.7)] border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-[#444748] shadow-sm dark:shadow-none'
            }`}
          >
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex items-center gap-3 flex-wrap">
                {isArchived ? (
                  <span className="bg-slate-200/80 dark:bg-[#1a1a1a] text-slate-600 dark:text-[#6b7280] border border-slate-300/80 dark:border-[#374151]/40 px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                    ARCHIVED
                  </span>
                ) : arena.status === 'LIVE' ? (
                  <span className="bg-[#201f1f] text-[#22C55E] border border-[#22C55E]/30 px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE
                  </span>
                ) : arena.status === 'LOBBY' ? (
                  <span className="bg-[#201f1f] text-[#EAB308] border border-[#EAB308]/30 px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest">
                    LOBBY
                  </span>
                ) : isResolved ? (
                  <span
                    className={`px-2 py-0.5 rounded-full border font-['Epilogue'] text-[10px] font-bold tracking-widest ${
                      arena.resolvedOutcome === 'YES'
                        ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                        : arena.resolvedOutcome === 'NO'
                          ? 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]'
                          : 'bg-[#EAB308]/15 border-[#EAB308]/30 text-[#EAB308]'
                    }`}
                  >
                    RESOLVED — {arena.resolvedOutcome}
                  </span>
                ) : (
                  <span className="bg-[#201f1f] text-[#c4c7c8] border border-[#27272A] px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest">
                    FINISHED (AWAITING RESOLUTION)
                  </span>
                )}
                <span className="bg-[#201f1f] border border-[#27272A] px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold text-white uppercase">
                  {arena.code}
                </span>
              </div>

              <h3 className={`font-['Geist'] text-xl font-medium ${isArchived ? 'text-[#6b7280]' : 'text-white'}`}>
                {arena.name}
              </h3>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-['Epilogue'] text-xs text-[#c4c7c8]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">toll</span> {arena.asset}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">layers</span> {arena.totalRounds} Rounds
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">groups</span> {arena.participantCount} Participants
                </span>
                <span className="flex items-center gap-1.5 text-[#22C55E]">
                  <span className="material-symbols-outlined text-[16px]">how_to_vote</span> {arena.predictionCount} Predictions
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end mt-2 md:mt-0">
              {/* Actions are hidden for archived arenas unless SUPERADMIN */}
              {!isArchived && (
                <>
                  <button
                    type="button"
                    onClick={() => setShareArena({ code: arena.code, name: arena.name })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#27272A] bg-[#201f1f] text-xs font-['Epilogue'] font-bold text-white hover:bg-[#2a2a2a] transition-colors"
                    title="View QR Code & Share"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#22C55E]">qr_code_2</span>
                    <span>QR / Share</span>
                  </button>
                  <Link
                    href={`/arenas/${arena.code}/screen`}
                    className="flex items-center justify-center w-9 h-9 rounded-full border border-[#27272A] bg-[#201f1f] text-[#c4c7c8] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                    title="Auditorium Big Screen View"
                  >
                    <span className="material-symbols-outlined text-lg">desktop_windows</span>
                  </Link>
                  <Link
                    href={`/admin/arenas/${arena.code}`}
                    className="bg-white text-[#2f3131] font-['Epilogue'] text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#c6c6c7] transition-all whitespace-nowrap"
                  >
                    Control Panel
                  </Link>
                </>
              )}

              {/* SUPERADMIN: Archive / Unarchive button */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => handleArchive(arena.id, arena.name, arena.status)}
                  disabled={archivingId === arena.id}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    isArchived
                      ? 'border-amber-500/30 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 hover:border-amber-500/50'
                      : 'border-[#374151]/50 bg-[#1a1a1a] text-[#6b7280] hover:bg-[#1f1f1f] hover:text-[#9ca3af] hover:border-[#374151]'
                  }`}
                  title={isArchived ? 'Unarchive Arena' : 'Archive Arena'}
                >
                  {archivingId === arena.id ? (
                    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">
                      {isArchived ? 'unarchive' : 'inventory_2'}
                    </span>
                  )}
                </button>
              )}

              {/* Delete button — shown for non-archived only, or always for SUPERADMIN */}
              {(!isArchived || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(arena.id, arena.name)}
                  disabled={deletingId === arena.id}
                  className="w-9 h-9 rounded-full border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:border-red-500/50 flex items-center justify-center transition-colors shrink-0"
                  title="Delete Arena"
                >
                  {deletingId === arena.id ? (
                    <span className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">delete</span>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Unique QR Code / Share Modal */}
      {shareArena && (
        <ArenaShareModal
          code={shareArena.code}
          name={shareArena.name}
          isOpen={true}
          onClose={() => setShareArena(null)}
        />
      )}
    </div>
  );
}

