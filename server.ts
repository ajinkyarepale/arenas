import { loadEnvConfig } from '@next/env';
import { createServer } from 'node:http';
import { parse } from 'node:url';

loadEnvConfig(process.cwd());

import next from 'next';
import { Server as SocketIoServer } from 'socket.io';

import { buildSnapshot, findArenaByCode } from './src/lib/engine/snapshot';
import { startScheduler, stopScheduler } from './src/lib/engine/scheduler';
import { startPriceStream, stopPriceStream } from './src/lib/price/binance-stream';
import { registerBroadcaster } from './src/lib/realtime/bus';
import {
  arenaRoom,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './src/lib/realtime/events';
import { prisma } from './src/lib/prisma';

/**
 * Arenas runs behind one custom Node server rather than the stock `next start`,
 * because three things need to share a process:
 *
 *   1. Next.js itself (pages and API routes),
 *   2. the Socket.io server pushing prices, market state and leaderboards,
 *   3. the round scheduler advancing every live arena.
 *
 * Sharing a process is what lets an API route that fills a trade broadcast the
 * new price immediately, with no queue or pub/sub hop in between.
 */

const dev = process.env.NODE_ENV !== 'production';
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main(): Promise<void> {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    try {
      // `parse` with query parsing is what Next's own server does.
      handle(req, res, parse(req.url ?? '/', true));
    } catch (error) {
      console.error('[http] request failed', error);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: '/api/socket',
    // Allow the long-poll fallback. iOS Safari will occasionally fail to
    // upgrade to websockets on hotel/campus wifi, and a participant mid-round
    // should degrade to polling rather than see a dead screen.
    transports: ['websocket', 'polling'],
    pingInterval: 20_000,
    pingTimeout: 25_000,
    cors: dev ? { origin: true, credentials: true } : undefined,
  });

  // Give the rest of the app a way to broadcast.
  registerBroadcaster((room, event, ...args) => {
    (io.to(room).emit as (event: string, ...args: unknown[]) => void)(event, ...args);
  });

  io.on('connection', (socket) => {
    // Everything broadcast to an arena room is public information — prices,
    // implied probability, the leaderboard. Private state (your balance, your
    // position) is never pushed here; it is fetched over authenticated HTTP.
    // That is what lets the projector view subscribe without a login.
    let subscribedRooms: string[] = [];

    socket.on('subscribe', async ({ code }) => {
      try {
        const normalised = String(code ?? '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4,12}$/.test(normalised)) {
          socket.emit('error', { message: 'Invalid arena code' });
          return;
        }
        if (subscribedRooms.length > 4) {
          socket.emit('error', { message: 'Too many subscriptions' });
          return;
        }

        const event = await findArenaByCode(normalised);
        if (!event) {
          socket.emit('error', { message: 'Arena not found' });
          return;
        }

        const room = arenaRoom(event.id);
        await socket.join(room);
        subscribedRooms.push(room);
        socket.emit('subscribed', { eventId: event.id, code: event.code });

        // Send the current state straight away so a reconnecting client is
        // correct immediately instead of waiting for the next broadcast.
        const snapshot = await buildSnapshot(event, null, { leaderboardLimit: 20 });
        socket.emit('arena', {
          status: snapshot.arena.status,
          currentRound: snapshot.arena.currentRound,
          totalRounds: snapshot.arena.totalRounds,
          endedAt: snapshot.arena.endsAt,
        });
        if (snapshot.round) socket.emit('round', snapshot.round);
        socket.emit('leaderboard', snapshot.leaderboard);
      } catch (error) {
        console.error('[socket] subscribe failed', error);
        socket.emit('error', { message: 'Could not subscribe to that arena' });
      }
    });

    socket.on('unsubscribe', async ({ code }) => {
      const normalised = String(code ?? '').trim().toUpperCase();
      const event = await findArenaByCode(normalised).catch(() => null);
      if (!event) return;
      const room = arenaRoom(event.id);
      await socket.leave(room);
      subscribedRooms = subscribedRooms.filter((r) => r !== room);
    });

    socket.on('disconnect', () => {
      subscribedRooms = [];
    });
  });

  startScheduler();
  startPriceStream();

  httpServer.listen(port, hostname, () => {
    console.log(`\n  Arenas ready on http://localhost:${port}`);
    console.log(`  Socket.io listening on /api/socket`);
    console.log(`  ${dev ? 'development' : 'production'} mode\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received, shutting down`);
    stopScheduler();
    stopPriceStream();
    io.close();
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[server] failed to start', error);
  process.exit(1);
});
