import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_SERVICE_TREE,
  seedDefaultServiceTree,
} from '../src/shared/seeds/default-service-tree.seed';

// ─── Standalone runner ────────────────────────────────────────────────────────
// The implementation lives in src/shared/seeds/default-service-tree.seed.ts so
// the Nest build (sourceRoot: src) stays clean; this file is the CLI entry
// point and can also be called from prisma/seed.ts.
//
// Usage: npx ts-node prisma/seed-service-tree.ts <tenantId>

export { DEFAULT_SERVICE_TREE, seedDefaultServiceTree };

async function main() {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error(
      '❌ Usage: npx ts-node prisma/seed-service-tree.ts <tenantId>',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const result = await seedDefaultServiceTree(tenantId, prisma);
    if (result.seeded) {
      console.log(
        `✅ Seeded ${result.categories} categories + ${result.subCategories} sub-categories for tenant ${tenantId}`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has service categories — skipped (idempotent)`,
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
