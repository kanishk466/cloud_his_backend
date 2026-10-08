import { PrismaClient } from '@prisma/client';
import { seedDefaultPackages } from '../src/shared/seeds/default-packages.seed';

// ─── Standalone runner ────────────────────────────────────────────────────────
// Usage: npx ts-node prisma/seed-packages.ts <tenantId>

export { seedDefaultPackages };

async function main() {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error('❌ Usage: npx ts-node prisma/seed-packages.ts <tenantId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const result = await seedDefaultPackages(tenantId, prisma);
    if (result.seeded) {
      console.log(
        `✅ Seeded ${result.packages} packages (${result.components} components, ${result.consults} consults, ${result.exclusions} exclusions) for tenant ${tenantId}`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has packages — skipped (idempotent)`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
