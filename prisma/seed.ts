import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(
    'Admin@123',
    10,
  );

  const superAdminRole = await prisma.role.upsert({
    where: {
      name: 'SUPER_ADMIN',
    },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Platform Super Administrator',
    },
  });

  const superAdminUser =
    await prisma.platformUser.upsert({
      where: {
        email: 'admin@platform.com',
      },
      update: {},
      create: {
        email: 'admin@platform.com',
        passwordHash,
        firstName: 'Platform',
        lastName: 'Admin',
        status: 'ACTIVE',
      },
    });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('✅ SUPER_ADMIN seeded');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });