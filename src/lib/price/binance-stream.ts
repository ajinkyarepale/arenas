import { emitToArena } from '@/lib/realtime/bus';
import { prisma } from '@/lib/prisma';
import type { PriceTick } from '@/lib/price/binance';

/**
 * Real-time Binance WebSocket Stream Manager.
 *
 * Connects directly to Binance public aggregate trade stream (wss://stream.binance.com:9443).
 * Every trade on Binance worldwide is received in sub-50ms real-time and pushed to all
 * active arena participants and big-screen displays via Socket.io.
 */

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const EMIT_THROTTLE_MS = 60; // Max ~16 updates per second for silky smooth UI without flooding

export const streamPriceCache = new Map<string, PriceTick>();

interface StreamState {
  ws: WebSocket | null;
  activeSymbols: string[];
  eventAssetMap: Map<string, string[]>; // asset -> eventIds[]
  lastEmitMap: Map<string, number>; // eventId -> lastEmitTimestamp
  pollTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  isRunning: boolean;
}

const globalForStream = globalThis as unknown as {
  __arenasPriceStream?: StreamState;
};

function getState(): StreamState {
  if (!globalForStream.__arenasPriceStream) {
    globalForStream.__arenasPriceStream = {
      ws: null,
      activeSymbols: [...DEFAULT_SYMBOLS],
      eventAssetMap: new Map(),
      lastEmitMap: new Map(),
      pollTimer: null,
      reconnectTimer: null,
      isRunning: false,
    };
  }
  return globalForStream.__arenasPriceStream;
}

export function getStreamPrice(symbol: string): PriceTick | undefined {
  return streamPriceCache.get(symbol.trim().toUpperCase());
}

async function refreshActiveArenas(): Promise<void> {
  const state = getState();
  try {
    const events = await prisma.event.findMany({
      where: { status: { in: ['LIVE', 'LOBBY'] } },
      select: { id: true, asset: true },
    });

    const newMap = new Map<string, string[]>();
    const symbolsSet = new Set<string>(DEFAULT_SYMBOLS);

    for (const ev of events) {
      const sym = ev.asset.trim().toUpperCase();
      symbolsSet.add(sym);
      const list = newMap.get(sym) ?? [];
      list.push(ev.id);
      newMap.set(sym, list);
    }

    state.eventAssetMap = newMap;

    const currentSymbols = Array.from(symbolsSet).sort();
    const prevSymbols = [...state.activeSymbols].sort();

    // Reconnect if the tracked symbols set changed
    if (JSON.stringify(currentSymbols) !== JSON.stringify(prevSymbols)) {
      state.activeSymbols = currentSymbols;
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        connectWebSocket();
      }
    }
  } catch (error) {
    console.error('[binance-stream] Failed to refresh active arena assets:', error);
  }
}

function connectWebSocket(): void {
  const state = getState();
  if (!state.isRunning) return;

  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  if (state.ws) {
    try {
      state.ws.onclose = null;
      state.ws.onerror = null;
      state.ws.onmessage = null;
      state.ws.close();
    } catch {}
    state.ws = null;
  }

  const streams = state.activeSymbols
    .map((s) => `${s.toLowerCase()}@aggTrade`)
    .join('/');

  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

  try {
    const ws = new WebSocket(url);
    state.ws = ws;

    ws.onopen = () => {
      console.log(`[binance-stream] Connected to live Binance WebSocket (${state.activeSymbols.join(', ')})`);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
        const data = parsed?.data ?? parsed;
        if (!data || data.e !== 'aggTrade') return;

        const symbol = String(data.s).toUpperCase();
        const price = Number.parseFloat(data.p);
        const at = Number(data.T) || Date.now();

        if (!Number.isFinite(price) || price <= 0) return;

        const tick: PriceTick = { symbol, price, at };
        streamPriceCache.set(symbol, tick);

        // Fanout to active arenas trading this asset
        const eventIds = state.eventAssetMap.get(symbol);
        if (!eventIds || eventIds.length === 0) return;

        const now = Date.now();
        for (const eventId of eventIds) {
          const lastEmit = state.lastEmitMap.get(eventId) ?? 0;
          if (now - lastEmit >= EMIT_THROTTLE_MS) {
            state.lastEmitMap.set(eventId, now);
            emitToArena(eventId, 'price', {
              symbol,
              price,
              at,
            });
          }
        }
      } catch (err) {
        // Drop malformed frames silently
      }
    };

    ws.onerror = (error) => {
      console.warn('[binance-stream] WebSocket error, will reconnect:', error);
    };

    ws.onclose = () => {
      if (!state.isRunning) return;
      console.log('[binance-stream] WebSocket closed, scheduling reconnect in 2s...');
      state.reconnectTimer = setTimeout(connectWebSocket, 2000);
    };
  } catch (err) {
    console.error('[binance-stream] Failed to open WebSocket:', err);
    state.reconnectTimer = setTimeout(connectWebSocket, 3000);
  }
}

export function startPriceStream(): void {
  const state = getState();
  if (state.isRunning) return;
  state.isRunning = true;

  void refreshActiveArenas().then(() => {
    connectWebSocket();
  });

  // Check for newly started arenas every 5 seconds
  state.pollTimer = setInterval(() => {
    void refreshActiveArenas();
  }, 5000);
  state.pollTimer.unref?.();
}

export function stopPriceStream(): void {
  const state = getState();
  state.isRunning = false;

  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.ws) {
    try {
      state.ws.close();
    } catch {}
    state.ws = null;
  }
}
