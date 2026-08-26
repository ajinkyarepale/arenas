import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ORGANIZER_EMAIL = process.env.SEED_ORGANIZER_EMAIL ?? 'organizer@arenas.dev';
const ORGANIZER_PASSWORD = process.env.SEED_ORGANIZER_PASSWORD ?? 'arenas-demo-2024';

async function main() {
  const passwordHash = await bcrypt.hash(ORGANIZER_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: ORGANIZER_EMAIL },
    create: {
      email: ORGANIZER_EMAIL,
      name: 'Organizer Account',
      passwordHash,
      role: 'ORGANIZER',
    },
    update: { role: 'ORGANIZER' },
  });

  console.log('Seed completed: Only superadmin/organizer account created. Zero demo events.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
