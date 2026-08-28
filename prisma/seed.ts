import { seedDefaultPermissions } from '../src/lib/auth/rbac';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding default RBAC permissions and roles...');
  await seedDefaultPermissions();
  console.log('RBAC Permissions and Roles seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
