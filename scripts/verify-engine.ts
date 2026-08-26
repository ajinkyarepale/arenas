/**
 * End-to-end engine verification against a real database.
 *
 * The unit tests cover the LMSR maths in isolation; this covers the parts that
 * only break once Postgres, transactions and concurrency are involved:
 *
 *   1. Concurrent trades never corrupt the book. Fifty simultaneous buys must
 *      leave qYes/qNo exactly equal to the sum of shares issued, and the total
 *      points collected must equal C(after) - C(before) to the cent.
 *   2. Settlement pays 1 point per winning share and nothing for losers.
 *   3. A VOID round refunds every participant exactly what they paid.
 *   4. Balances never go negative, and the house subsidy stays within b·ln(2).
 *
 * Run with:  npm run verify:engine
 * Creates and then deletes its own throwaway arena.
 */

import { cost as lmsrCost, maxSubsidy, priceYes } from '../src/lib/lmsr';
import { settleRound } from '../src/lib/engine/round-engine';
import { placeTrade } from '../src/lib/engine/trading';
import { prisma } from '../src/lib/prisma';

const B = 40;
const STARTING_BALANCE = 1000;
const TRADERS = 10;
const TRADES_PER_TRADER = 5;

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function closeTo(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon;
}

/**
 * The real scheduler only advances arenas whose status is LIVE, and it will
 * happily open the next round the moment one resolves. This script drives the
 * lifecycle by hand, so the arena is only LIVE while trades are being placed
 * and is parked in DRAFT for every step where we create or settle a round
 * ourselves. Without this the script races a running dev server.
 */
let eventId = '';
async function setStatus(status: 'DRAFT' | 'LIVE'): Promise<void> {
  await prisma.event.update({ where: { id: eventId }, data: { status } });
}

async function main() {
  const suffix = Date.now().toString(36).toUpperCase().slice(-5);

  const organizer = await prisma.user.create({
    data: {
      email: `verify-${suffix}@arenas.test`,
      name: 'Verification Organizer',
      passwordHash: 'x'.repeat(60),
      role: 'ORGANIZER',
    },
  });

  const event = await prisma.event.create({
    data: {
      code: `VF${suffix}`,
      name: 'Engine verification',
      organizerId: organizer.id,
      asset: 'BTCUSDT',
      roundDurationSec: 600,
      lockBufferSec: 30,
      totalRounds: 2,
      startingBalance: STARTING_BALANCE,
      liquidityParamB: B,
      maxStakePerTrade: 100,
      status: 'DRAFT',
      currentRound: 1,
    },
  });

  const users = await Promise.all(
    Array.from({ length: TRADERS }, (_, i) =>
      prisma.user.create({
        data: {
          email: `verify-${suffix}-${i}@arenas.test`,
          name: `Trader ${i + 1}`,
          passwordHash: 'x'.repeat(60),
        },
      }),
    ),
  );

  await prisma.eventParticipant.createMany({
    data: users.map((user) => ({
      eventId: event.id,
      userId: user.id,
      balance: STARTING_BALANCE,
    })),
  });

  eventId = event.id;

  const round = await prisma.round.create({
    data: {
      eventId: event.id,
      roundNumber: 1,
      openPrice: 70_000,
      status: 'TRADING',
      qYes: 0,
      qNo: 0,
      opensAt: new Date(),
      locksAt: new Date(Date.now() + 10 * 60_000),
      resolvesAt: new Date(Date.now() + 11 * 60_000),
    },
  });

  console.log(`\nArena ${event.code} — ${TRADERS} traders, b = ${B}\n`);

  // --- 1. Concurrency -----------------------------------------------------
  console.log('1. Concurrent trades');

  await setStatus('LIVE');

  const costBefore = lmsrCost({ qYes: 0, qNo: 0 }, B);

  // Fire everything at once, deliberately racing the optimistic-concurrency
  // guard in placeTrade.
  const jobs = users.flatMap((user, userIndex) =>
    Array.from({ length: TRADES_PER_TRADER }, (_, tradeIndex) =>
      placeTrade({
        eventId: event.id,
        userId: user.id,
        side: (userIndex + tradeIndex) % 2 === 0 ? 'YES' : 'NO',
        stake: 10 + ((userIndex * 3 + tradeIndex * 7) % 40),
      }),
    ),
  );

  const results = await Promise.all(jobs);
  await setStatus('DRAFT');
  const filled = results.filter((r) => r.ok);
  const rejected = results.filter((r) => !r.ok);

  check(
    `all ${jobs.length} trades filled`,
    rejected.length === 0,
    rejected.map((r) => (r.ok ? '' : r.reason)).join(', '),
  );

  const roundAfter = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
  const trades = await prisma.trade.findMany({ where: { roundId: round.id } });

  const sharesYes = trades
    .filter((t) => t.side === 'YES')
    .reduce((sum, t) => sum + t.shares, 0);
  const sharesNo = trades
    .filter((t) => t.side === 'NO')
    .reduce((sum, t) => sum + t.shares, 0);
  const collected = trades.reduce((sum, t) => sum + t.cost, 0);

  check(
    'book qYes equals the sum of YES shares issued',
    closeTo(roundAfter.qYes, sharesYes, 1e-6),
    `book=${roundAfter.qYes} trades=${sharesYes}`,
  );
  check(
    'book qNo equals the sum of NO shares issued',
    closeTo(roundAfter.qNo, sharesNo, 1e-6),
    `book=${roundAfter.qNo} trades=${sharesNo}`,
  );

  const costAfter = lmsrCost({ qYes: roundAfter.qYes, qNo: roundAfter.qNo }, B);
  check(
    'points collected equal C(after) - C(before)',
    closeTo(collected, costAfter - costBefore, 1e-6),
    `collected=${collected.toFixed(8)} expected=${(costAfter - costBefore).toFixed(8)}`,
  );

  const participantsMid = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
  });
  const spent = participantsMid.reduce(
    (sum, p) => sum + (STARTING_BALANCE - p.balance),
    0,
  );
  check(
    'points debited from balances equal points collected',
    closeTo(spent, collected, 1e-6),
    `debited=${spent.toFixed(8)} collected=${collected.toFixed(8)}`,
  );
  check(
    'no balance went negative',
    participantsMid.every((p) => p.balance >= 0),
  );

  console.log(
    `        book: qYes=${roundAfter.qYes.toFixed(2)} qNo=${roundAfter.qNo.toFixed(2)} ` +
      `p(YES)=${(priceYes({ qYes: roundAfter.qYes, qNo: roundAfter.qNo }, B) * 100).toFixed(1)}% ` +
      `volume=${collected.toFixed(2)}pts`,
  );

  // --- 2. Settlement ------------------------------------------------------
  console.log('\n2. Settlement (YES wins)');

  await settleRound(round.id, 'YES', 70_100, null);

  const settledTrades = await prisma.trade.findMany({ where: { roundId: round.id } });
  check(
    'every trade has a payout and a settled timestamp',
    settledTrades.every((t) => t.payout !== null && t.settledAt !== null),
  );
  check(
    'winning shares pay exactly 1 point each',
    settledTrades
      .filter((t) => t.side === 'YES')
      .every((t) => closeTo(t.payout ?? -1, t.shares, 1e-9)),
  );
  check(
    'losing shares pay nothing',
    settledTrades.filter((t) => t.side === 'NO').every((t) => t.payout === 0),
  );

  const paidOut = settledTrades.reduce((sum, t) => sum + (t.payout ?? 0), 0);
  const participantsAfter = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
  });
  const netChange = participantsAfter.reduce(
    (sum, p) => sum + (p.balance - STARTING_BALANCE),
    0,
  );

  check(
    'balances moved by exactly (payouts - costs)',
    closeTo(netChange, paidOut - collected, 1e-6),
    `net=${netChange.toFixed(8)} expected=${(paidOut - collected).toFixed(8)}`,
  );

  const houseLoss = paidOut - collected;
  check(
    `house subsidy stays within b·ln(2) = ${maxSubsidy(B).toFixed(2)}`,
    houseLoss <= maxSubsidy(B) + 1e-6,
    `houseLoss=${houseLoss.toFixed(4)}`,
  );

  console.log(
    `        collected=${collected.toFixed(2)} paidOut=${paidOut.toFixed(2)} ` +
      `houseLoss=${houseLoss.toFixed(2)}pts`,
  );

  const resolved = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
  check('round is RESOLVED with outcome YES', resolved.status === 'RESOLVED' && resolved.outcome === 'YES');

  // Settling twice must be a no-op, not a double payout.
  const balancesBeforeReplay = (
    await prisma.eventParticipant.findMany({ where: { eventId: event.id }, orderBy: { id: 'asc' } })
  ).map((p) => p.balance);
  await settleRound(round.id, 'YES', 70_100, null);
  const balancesAfterReplay = (
    await prisma.eventParticipant.findMany({ where: { eventId: event.id }, orderBy: { id: 'asc' } })
  ).map((p) => p.balance);
  check(
    'settling an already-resolved round changes nothing',
    balancesBeforeReplay.every((b, i) => closeTo(b, balancesAfterReplay[i], 1e-9)),
  );

  // --- 3. VOID refund -----------------------------------------------------
  console.log('\n3. VOID refunds');

  await prisma.event.update({ where: { id: event.id }, data: { currentRound: 2 } });
  const roundTwoState = {
    openPrice: 70_100,
    status: 'TRADING' as const,
    qYes: 0,
    qNo: 0,
    closePrice: null,
    outcome: null,
    resolvedAt: null,
    opensAt: new Date(),
    locksAt: new Date(Date.now() + 10 * 60_000),
    resolvesAt: new Date(Date.now() + 11 * 60_000),
  };
  const round2 = await prisma.round.upsert({
    where: { eventId_roundNumber: { eventId: event.id, roundNumber: 2 } },
    create: { eventId: event.id, roundNumber: 2, ...roundTwoState },
    update: roundTwoState,
  });

  const balancesBeforeVoid = new Map(
    (await prisma.eventParticipant.findMany({ where: { eventId: event.id } })).map((p) => [
      p.id,
      p.balance,
    ]),
  );

  await setStatus('LIVE');
  await Promise.all(
    users.map((user, i) =>
      placeTrade({
        eventId: event.id,
        userId: user.id,
        side: i % 2 === 0 ? 'YES' : 'NO',
        stake: 25,
      }),
    ),
  );
  await setStatus('DRAFT');

  await settleRound(round2.id, 'VOID', null, 'Verification void');

  const balancesAfterVoid = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
  });
  check(
    'every balance is restored exactly after a void',
    balancesAfterVoid.every((p) =>
      closeTo(p.balance, balancesBeforeVoid.get(p.id) ?? -1, 1e-6),
    ),
  );

  const voidTrades = await prisma.trade.findMany({ where: { roundId: round2.id } });
  check(
    'void payouts equal the cost paid',
    voidTrades.every((t) => closeTo(t.payout ?? -1, t.cost, 1e-9)),
  );

  // --- 4. Guards ----------------------------------------------------------
  console.log('\n4. Guards');

  // Live again, so each rejection comes from the guard being tested rather
  // than from the arena simply not running.
  await setStatus('LIVE');

  const lockedRound = await prisma.round.findUniqueOrThrow({ where: { id: round2.id } });
  const afterLock = await placeTrade({
    eventId: event.id,
    userId: users[0].id,
    side: 'YES',
    stake: 10,
  });
  check(
    'trading a resolved round is rejected',
    !afterLock.ok && afterLock.reason === 'round-locked',
    afterLock.ok ? 'trade was accepted' : afterLock.reason,
  );
  void lockedRound;

  const overStake = await placeTrade({
    eventId: event.id,
    userId: users[0].id,
    side: 'YES',
    stake: 10_000,
  });
  check(
    'a stake above the arena maximum is rejected',
    !overStake.ok && overStake.reason === 'stake-too-large',
  );

  const stranger = await prisma.user.create({
    data: {
      email: `verify-${suffix}-stranger@arenas.test`,
      name: 'Stranger',
      passwordHash: 'x'.repeat(60),
    },
  });
  const notJoined = await placeTrade({
    eventId: event.id,
    userId: stranger.id,
    side: 'YES',
    stake: 10,
  });
  check(
    'someone who never joined cannot trade',
    !notJoined.ok && notJoined.reason === 'not-participant',
  );

  // --- Cleanup ------------------------------------------------------------
  await setStatus('DRAFT');
  await prisma.event.delete({ where: { id: event.id } });
  await prisma.user.deleteMany({
    where: { email: { startsWith: `verify-${suffix}` } },
  });

  console.log(
    failures === 0
      ? '\nAll engine checks passed.\n'
      : `\n${failures} check(s) FAILED.\n`,
  );

  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
