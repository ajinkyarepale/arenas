import { NextResponse } from 'next/server';

import { apiError, notFound } from '@/lib/api';
import { getCandles, intervalForRoundDuration } from '@/lib/price/binance';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Candle history for an arena's chart, proxied through the server.
 *
 * Browsers never call Binance directly: a room of 200 phones hitting the public
 * API would be rate-limited within seconds, and proxying keeps the client free
 * of any third-party origin.
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('That arena code is not valid.');

  const event = await prisma.event.findUnique({
    where: { code: parsed.data },
    select: { asset: true, roundDurationSec: true },
  });
  if (!event) return notFound('No arena with that code.');

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get('limit') ?? '90', 10) || 90, 10),
    300,
  );
  const requestedInterval = url.searchParams.get('interval');
  const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h'];
  const interval = (requestedInterval && validIntervals.includes(requestedInterval))
    ? requestedInterval
    : intervalForRoundDuration(event.roundDurationSec);

  try {
    const candles = await getCandles(event.asset, interval, limit);
    return NextResponse.json(
      { symbol: event.asset, interval, candles },
      { headers: { 'Cache-Control': 'public, max-age=5' } },
    );
  } catch (error) {
    console.error('[candles] feed error', error);
    return apiError('The price feed is unavailable right now.', 503);
  }
}
