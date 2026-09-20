/**
 * The realtime wire contract, shared by the Socket.io server and every browser
 * client so both sides agree on names and shapes.
 *
 * Everything broadcast here is public arena data: prices, market state, round
 * timing, leaderboard. Nothing user-private travels over the socket, which is
 * what lets the read-only big-screen route subscribe without authenticating.
 * Private state (your balance, your position) is fetched over authenticated
 * HTTP instead.
 */

export type RoundStatusWire = 'PENDING' | 'TRADING' | 'LOCKED' | 'RESOLVED';
export type EventStatusWire = 'DRAFT' | 'LOBBY' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED';
export type OutcomeWire = 'YES' | 'NO' | 'VOID';

export interface PricePayload {
  symbol: string;
  price: number;
  at: number;
}

export interface RoundPayload {
  id: string;
  roundNumber: number;
  totalRounds: number;
  status: RoundStatusWire;
  question?: string | null;
  openPrice: number | null;
  closePrice: number | null;
  outcome: OutcomeWire | null;
  /** Implied probability of YES, 0..1. */
  priceYes: number;
  qYes: number;
  qNo: number;
  /** Total points staked into this round across all participants. */
  volume: number;
  tradeCount: number;
  opensAt: string | null;
  locksAt: string | null;
  resolvesAt: string | null;
  settledAt?: string | null;
  /** Server clock at send time, so clients can correct for drift. */
  serverTime: string;
}

export interface MarketPayload {
  roundId: string;
  priceYes: number;
  qYes: number;
  qNo: number;
  volume: number;
  tradeCount: number;
  /** Set when the tick was caused by a specific fill, for the tape. */
  lastTrade?: {
    side: 'YES' | 'NO';
    shares: number;
    cost: number;
    displayName: string;
    at: string;
  };
}

export interface LeaderboardEntry {
  participantId: string;
  displayName: string;
  balance: number;
  rank: number;
  /** Change in rank since the previous round settled. Positive means climbed. */
  rankDelta: number;
  /** Points won or lost on the round that just settled. */
  lastRoundPnl: number;
}

export interface LeaderboardPayload {
  entries: LeaderboardEntry[];
  participantCount: number;
  updatedAt: string;
}

export interface ArenaStatePayload {
  status: EventStatusWire;
  currentRound: number;
  totalRounds: number;
  endedAt: string | null;
}

export interface RoundSettledPayload {
  roundId: string;
  roundNumber: number;
  outcome: OutcomeWire;
  openPrice: number | null;
  closePrice: number | null;
  voidReason: string | null;
}

/** Server -> client. */
export interface ServerToClientEvents {
  price: (payload: PricePayload) => void;
  round: (payload: RoundPayload) => void;
  market: (payload: MarketPayload) => void;
  leaderboard: (payload: LeaderboardPayload) => void;
  arena: (payload: ArenaStatePayload) => void;
  settled: (payload: RoundSettledPayload) => void;
  subscribed: (payload: { eventId: string; code: string }) => void;
  error: (payload: { message: string }) => void;
}

/** Client -> server. */
export interface ClientToServerEvents {
  subscribe: (payload: { code: string }) => void;
  unsubscribe: (payload: { code: string }) => void;
}

export function arenaRoom(eventId: string): string {
  return `arena:${eventId}`;
}
