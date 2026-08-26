/**
 * Remove throwaway arenas and accounts created while testing, leaving only the
 * seeded demo data. Safe to run any time in development.
 *
 *   npm run db:reset-demo
 */

import { prisma } from '../src/lib/prisma';

const KEEP_CODES = ['DEMO24', 'RECAP7'];

async function main() {
  const removedArenas = await prisma.event.deleteMany({
    where: { code: { notIn: KEEP_CODES } },
  });

  const removedUsers = await prisma.user.deleteMany({
    where: {
      AND: [
        { email: { not: { endsWith: '@arenas.dev' } } },
        { email: { not: { endsWith: '@arenas.test' } } },
      ],
    },
  });

  console.log(
    `Removed ${removedArenas.count} arena(s) and ${removedUsers.count} account(s).`,
  );
  console.log(`Kept: ${KEEP_CODES.join(', ')} and the seeded @arenas.dev accounts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
