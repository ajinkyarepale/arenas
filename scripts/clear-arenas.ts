/**
 * Clear All Arenas / Events from Database
 *
 * Removes all arena events, rounds, trades, participant balances,
 * and ledger entries via cascade delete while preserving all User accounts,
 * credentials, permissions, and sessions.
 *
 * Usage:
 *   npm run db:clear-arenas
 *   npm run db:clear-arenas -- "<TARGET_DATABASE_URL>"
 */

import { PrismaClient } from '../src/generated/client';

const targetUrl = process.argv[2] || process.env.DATABASE_URL;

if (!targetUrl) {
  console.error('\x1b[31mError: No DATABASE_URL found in environment or arguments.\x1b[0m');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: targetUrl },
  },
});

async function main() {
  console.log('\x1b[36mConnecting to database...\x1b[0m');

  const userCount = await prisma.user.count();
  const eventCount = await prisma.event.count();

  console.log(`Found ${eventCount} arena(s) and ${userCount} user account(s).`);

  if (eventCount === 0) {
    console.log('\x1b[33mNo arenas found to delete. Database is already clean.\x1b[0m');
    console.log(`Preserved: All ${userCount} user account(s).`);
    return;
  }

  const result = await prisma.event.deleteMany({});

  const remainingUsers = await prisma.user.count();

  console.log(`\x1b[32m✓ Successfully deleted ${result.count} arena event(s) and associated tournament data.\x1b[0m`);
  console.log(`\x1b[32m✓ Preserved all ${remainingUsers} user account(s), roles, and credentials.\x1b[0m`);
}

main()
  .catch((err) => {
    console.error('\x1b[31mFailed to clear arenas:\x1b[0m', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
