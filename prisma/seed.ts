import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Development seed.
 *
 * Creates one organizer, a handful of participants, and two arenas — one in the
 * lobby ready to start, one already finished with a full round history — so the
 * dashboard, results and admin screens all have something real to render before
 * a live event has ever been run.
 *
 * Safe to re-run: everything is upserted on a natural key.
 */

const prisma = new PrismaClient();

const ORGANIZER_EMAIL = process.env.SEED_ORGANIZER_EMAIL ?? 'organizer@arenas.dev';
const ORGANIZER_PASSWORD = process.env.SEED_ORGANIZER_PASSWORD ?? 'arenas-demo-2024';

const PARTICIPANTS = [
  'Ada Chen',
  'Rohan Mehta',
  'Priya Nair',
  'Marcus Webb',
  'Sofia Alvarez',
  'Kenji Watanabe',
  'Leah Okafor',
  'Tom Bradshaw',
];

async function main() {
  const passwordHash = await bcrypt.hash(ORGANIZER_PASSWORD, 12);

  const organizer = await prisma.user.upsert({
    where: { email: ORGANIZER_EMAIL },
    create: {
      email: ORGANIZER_EMAIL,
      name: 'Demo Organizer',
      passwordHash,
      role: 'ORGANIZER',
    },
    update: { role: 'ORGANIZER' },
  });

  const participants = await Promise.all(
    PARTICIPANTS.map(async (name, index) => {
      const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@arenas.dev`;
      return prisma.user.upsert({
        where: { email },
        create: {
          email,
          name,
          passwordHash,
          role: 'PARTICIPANT',
        },
        update: {},
      });
    }),
  );

  // --- A lobby arena, ready for an organizer to press start. ---------------
  const upcoming = await prisma.event.upsert({
    where: { code: 'DEMO24' },
    create: {
      code: 'DEMO24',
      name: 'FinTech Society Trading Night',
      description:
        'Twelve rounds of 5-Min Candle on BTC. Open to all years — prizes for the top three.',
      hostName: 'Demo University FinTech Society',
      organizerId: organizer.id,
      asset: 'BTCUSDT',
      roundDurationSec: 300,
      lockBufferSec: 30,
      totalRounds: 12,
      startingBalance: 1000,
      liquidityParamB: 40,
      maxStakePerTrade: 250,
      status: 'LOBBY',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    update: {},
  });

  for (const user of participants.slice(0, 5)) {
    await prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId: upcoming.id, userId: user.id } },
      create: { eventId: upcoming.id, userId: user.id, balance: upcoming.startingBalance },
      update: {},
    });
  }

  // --- A finished arena, with settled rounds and a real leaderboard. -------
  const finished = await prisma.event.upsert({
    where: { code: 'RECAP7' },
    create: {
      code: 'RECAP7',
      name: 'Intro to Prediction Markets — Workshop',
      description: 'A short six-round demo run during the intro session.',
      hostName: 'Demo University FinTech Society',
      organizerId: organizer.id,
      asset: 'BTCUSDT',
      roundDurationSec: 180,
      lockBufferSec: 20,
      totalRounds: 6,
      startingBalance: 500,
      liquidityParamB: 30,
      maxStakePerTrade: 150,
      status: 'ENDED',
      currentRound: 6,
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    update: {},
  });

  const existingRounds = await prisma.round.count({ where: { eventId: finished.id } });

  if (existingRounds === 0) {
    const basePrice = 64_000;

    for (let roundNumber = 1; roundNumber <= 6; roundNumber += 1) {
      const openPrice = basePrice + roundNumber * 37;
      // Deterministic alternation so the seed is reproducible.
      const closedUp = roundNumber % 3 !== 0;
      const closePrice = openPrice + (closedUp ? 24 : -19);

      await prisma.round.create({
        data: {
          eventId: finished.id,
          roundNumber,
          openPrice,
          closePrice,
          outcome: closedUp ? 'YES' : 'NO',
          status: 'RESOLVED',
          qYes: closedUp ? 120 : 60,
          qNo: closedUp ? 55 : 110,
          opensAt: new Date(Date.now() - (4 - roundNumber * 0.2) * 60 * 60 * 1000),
          locksAt: new Date(Date.now() - (4 - roundNumber * 0.2) * 60 * 60 * 1000 + 160_000),
          resolvesAt: new Date(Date.now() - (4 - roundNumber * 0.2) * 60 * 60 * 1000 + 180_000),
          resolvedAt: new Date(Date.now() - (4 - roundNumber * 0.2) * 60 * 60 * 1000 + 180_000),
        },
      });
    }

    const rounds = await prisma.round.findMany({
      where: { eventId: finished.id },
      orderBy: { roundNumber: 'asc' },
    });

    for (const [index, user] of participants.entries()) {
      const participant = await prisma.eventParticipant.upsert({
        where: { eventId_userId: { eventId: finished.id, userId: user.id } },
        create: {
          eventId: finished.id,
          userId: user.id,
          balance: finished.startingBalance,
        },
        update: {},
      });

      let balance = finished.startingBalance;

      for (const round of rounds) {
        // Spread skill across the field so the leaderboard is not a straight line.
        const picksYes = (index + round.roundNumber) % 3 !== 0;
        const side = picksYes ? 'YES' : 'NO';
        const cost = 20 + ((index * 7 + round.roundNumber * 3) % 40);
        const priceAtFill = picksYes ? 0.58 : 0.44;
        const shares = cost / priceAtFill;
        const payout = round.outcome === side ? shares : 0;

        await prisma.trade.create({
          data: {
            eventId: finished.id,
            roundId: round.id,
            userId: user.id,
            participantId: participant.id,
            side,
            shares,
            cost,
            priceAtFill,
            payout,
            settledAt: round.resolvedAt,
          },
        });

        balance += payout - cost;
      }

      await prisma.eventParticipant.update({
        where: { id: participant.id },
        data: { balance },
      });
    }
  }

  console.log('\nSeed complete.\n');
  console.log(`  Organizer:  ${ORGANIZER_EMAIL}`);
  console.log(`  Password:   ${ORGANIZER_PASSWORD}`);
  console.log(`  Lobby arena:    ${upcoming.code}  (${upcoming.name})`);
  console.log(`  Finished arena: ${finished.code}  (${finished.name})`);
  console.log(`\n  Participants sign in with their own email and the same password.`);
  console.log(`  e.g. ada.chen@arenas.dev\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
