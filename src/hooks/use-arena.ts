'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { ArenaSnapshot } from '@/lib/engine/snapshot';
import type {
  ArenaStatePayload,
  ClientToServerEvents,
  LeaderboardPayload,
  MarketPayload,
  PricePayload,
  RoundPayload,
  RoundSettledPayload,
  ServerToClientEvents,
} from '@/lib/realtime/events';

/**
 * Live arena state for a screen.
 *
 * The design principle here is that the socket is an accelerator, never the
 * source of truth. Everything can be rebuilt from `GET /api/arenas/:code/state`,
 * and the hook re-fetches that snapshot whenever it has any reason to believe
 * it may have missed something:
 *
 *   - on mount,
 *   - whenever the socket (re)connects,
 *   - when the tab becomes visible again,
 *   - when the page is restored from the back/forward cache,
 *   - when the browser reports the network came back,
 *   - and whenever a round settles.
 *
 * That list is aimed squarely at iOS Safari. A locked phone suspends timers and
 * silently drops the websocket; when the participant unlocks it mid-round,
 * Safari fires `visibilitychange` (and `pageshow` with `persisted` after a
 * bfcache restore) but the socket may take seconds to notice it is dead. Rather
 * than trying to replay missed messages, we just ask the server what is true
 * now — which is correct regardless of how long the phone was asleep.
 */

export interface UseArenaResult {
  snapshot: ArenaSnapshot | null;
  round: RoundPayload | null;
  leaderboard: LeaderboardPayload | null;
  arena: ArenaStatePayload | null;
  price: PricePayload | null;
  lastTrade: MarketPayload['lastTrade'] | null;
  lastSettled: RoundSettledPayload | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
  /** Server clock minus client clock, in ms. Add to Date.now() for server time. */
  clockOffsetMs: number;
  refresh: () => Promise<void>;
}

export function useArena(code: string): UseArenaResult {
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [round, setRound] = useState<RoundPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [arena, setArena] = useState<ArenaStatePayload | null>(null);
  const [price, setPrice] = useState<PricePayload | null>(null);
  const [lastTrade, setLastTrade] = useState<MarketPayload['lastTrade'] | null>(null);
  const [lastSettled, setLastSettled] = useState<RoundSettledPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  // Guards against two refreshes racing and applying out of order.
  const refreshSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    try {
      const requestedAt = Date.now();
      const res = await fetch(`/api/arenas/${encodeURIComponent(code)}/state`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load this arena');
      }
      const data: ArenaSnapshot & { price: PricePayload | null } = await res.json();

      // A later refresh already landed — drop this one.
      if (seq !== refreshSeq.current) return;

      // Estimate clock skew, discounting half the round-trip. Phones with a
      // badly wrong clock would otherwise show a nonsense countdown.
      const rtt = Date.now() - requestedAt;
      const serverNow = new Date(data.serverTime).getTime();
      setClockOffsetMs(serverNow + rtt / 2 - Date.now());

      setSnapshot(data);
      setRound(data.round);
      setLeaderboard(data.leaderboard);
      setArena({
        status: data.arena.status,
        currentRound: data.arena.currentRound,
        totalRounds: data.arena.totalRounds,
        endedAt: data.arena.endsAt,
      });
      if (data.price) setPrice(data.price);
      setError(null);
    } catch (err) {
      if (seq !== refreshSeq.current) return;
      setError(err instanceof Error ? err.message : 'Could not load this arena');
    } finally {
      if (seq === refreshSeq.current) setLoading(false);
    }
  }, [code]);

  // Initial load.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Socket lifecycle.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      // Keep trying essentially forever: a participant who walks out of wifi
      // range mid-event should reconnect on their own when they walk back in.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      timeout: 10_000,
    });
    socketRef.current = socket;

    const subscribe = () => socket.emit('subscribe', { code });

    socket.on('connect', () => {
      setConnected(true);
      subscribe();
      // Re-sync on every connect, not just the first: this is the reconnect
      // path after a phone wakes up.
      void refresh();
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('price', (payload) => setPrice(payload));

    socket.on('round', (payload) => {
      setRound(payload);
      setClockOffsetMs(new Date(payload.serverTime).getTime() - Date.now());
    });

    socket.on('market', (payload) => {
      // A fill only moves the book, so patch the round rather than replacing it.
      setRound((current) =>
        current && current.id === payload.roundId
          ? {
              ...current,
              priceYes: payload.priceYes,
              qYes: payload.qYes,
              qNo: payload.qNo,
              volume: payload.volume,
              tradeCount: payload.tradeCount,
            }
          : current,
      );
      if (payload.lastTrade) setLastTrade(payload.lastTrade);
    });

    socket.on('leaderboard', (payload) => setLeaderboard(payload));
    socket.on('arena', (payload) => setArena(payload));

    socket.on('settled', (payload) => {
      setLastSettled(payload);
      setLastTrade(null);
      // Balances and positions changed; only the server knows the new numbers.
      void refresh();
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, refresh]);

  // Wake-up handling. This is the part that keeps a backgrounded phone honest.
  useEffect(() => {
    const resync = () => {
      const socket = socketRef.current;
      if (socket && !socket.connected) {
        // Nudge socket.io rather than waiting out its backoff timer, which may
        // itself have been suspended while the tab was frozen.
        socket.connect();
      }
      void refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') resync();
    };

    // `pageshow` with persisted=true means a bfcache restore — on iOS Safari
    // this happens on back-navigation and after the app switcher, and no
    // visibilitychange necessarily fires with it.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resync();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', resync);
    window.addEventListener('focus', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', resync);
      window.removeEventListener('focus', onVisibility);
    };
  }, [refresh]);

  // Safety net: a slow poll so a screen left running all evening cannot drift
  // permanently out of date if every socket event were somehow missed.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return {
    snapshot,
    round,
    leaderboard,
    arena,
    price,
    lastTrade,
    lastSettled,
    connected,
    loading,
    error,
    clockOffsetMs,
    refresh,
  };
}

/**
 * A countdown that ticks against server time rather than the device clock, and
 * recomputes from a timestamp on every tick so a suspended timer catches up
 * instantly instead of counting down from where it froze.
 */
export function useCountdown(target: string | null, clockOffsetMs = 0): number {
  const [remaining, setRemaining] = useState(() =>
    target ? new Date(target).getTime() - (Date.now() + clockOffsetMs) : 0,
  );

  useEffect(() => {
    if (!target) {
      setRemaining(0);
      return;
    }

    const targetMs = new Date(target).getTime();
    const compute = () => setRemaining(targetMs - (Date.now() + clockOffsetMs));

    compute();
    const timer = setInterval(compute, 200);
    return () => clearInterval(timer);
  }, [target, clockOffsetMs]);

  return remaining;
}
