import { NextResponse } from 'next/server';

import { notFound, requireUser } from '@/lib/api';
import { buildSnapshot, findArenaByCode } from '@/lib/engine/snapshot';
import { getCachedPrice, getPrice } from '@/lib/price/binance';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * The full-state endpoint every live screen falls back to.
 *
 * This is what makes the app survive a phone locking mid-round, an iOS Safari
 * tab being frozen in the background, or a projector losing wifi: rather than
 * trying to replay missed socket messages, the client just asks the server what
 * is true right now and re-renders from that.
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('That arena code is not valid.');

  const event = await findArenaByCode(parsed.data);
  if (!event) return notFound('No arena with that code.');

  const user = await requireUser();
  const snapshot = await buildSnapshot(event, user?.id ?? null, {
    leaderboardLimit: 50,
  });

  // Include the last price so a freshly loaded screen shows a number
  // immediately rather than waiting for the next socket tick.
  let price = getCachedPrice(event.asset) ?? null;
  if (!price) {
    price = await getPrice(event.asset).catch(() => null);
  }

  return NextResponse.json(
    { ...snapshot, price },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
