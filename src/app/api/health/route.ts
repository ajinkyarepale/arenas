import { NextResponse } from 'next/server';

import { isSchedulerRunning } from '@/lib/engine/scheduler';

export const dynamic = 'force-dynamic';

/**
 * Liveness check. Deliberately does not touch the database, so it stays cheap
 * enough to be hit every few minutes by a platform health probe or an uptime
 * pinger without adding load or connection-pool pressure.
 *
 * It does report whether the round scheduler is running in this process,
 * because a server that answers requests but is not advancing rounds is the
 * failure that quietly stalls a live event.
 */
export async function GET() {
  const schedulerRunning = isSchedulerRunning();

  return NextResponse.json(
    {
      ok: true,
      scheduler: schedulerRunning ? 'running' : 'stopped',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
    {
      // Never let a CDN or the browser answer this from cache — a cached 200
      // would make a dead process look healthy.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
