import { arenaRoom, type ServerToClientEvents } from '@/lib/realtime/events';

/**
 * A thin bridge between "code that wants to broadcast" and "the Socket.io
 * server that can".
 *
 * The custom server hosts Next.js, Socket.io, and the round scheduler in one
 * process, so API route handlers and the engine can reach the socket layer
 * through this module-level singleton. It is stashed on globalThis because
 * Next dev-mode module reloading would otherwise hand route handlers a fresh
 * copy of this module with an empty emitter.
 */

type Broadcast = <E extends keyof ServerToClientEvents>(
  room: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) => void;

const globalForBus = globalThis as unknown as {
  __arenasBroadcast?: Broadcast;
};

export function registerBroadcaster(fn: Broadcast): void {
  globalForBus.__arenasBroadcast = fn;
}

export function hasBroadcaster(): boolean {
  return typeof globalForBus.__arenasBroadcast === 'function';
}

/**
 * Broadcast to everyone watching one arena. A no-op when the socket server is
 * not up (for example during `next build`, or in unit tests) — realtime is an
 * enhancement, never a correctness dependency, since every screen can also
 * rebuild itself from the HTTP state snapshot.
 */
export function emitToArena<E extends keyof ServerToClientEvents>(
  eventId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  const broadcast = globalForBus.__arenasBroadcast;
  if (!broadcast) return;
  try {
    broadcast(arenaRoom(eventId), event, ...args);
  } catch (error) {
    console.error('[realtime] broadcast failed', error);
  }
}
