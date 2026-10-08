import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_ROOM_TYPES,
  DEFAULT_BED_AMENITIES,
  seedDefaultRoomTypes,
} from '../src/shared/seeds/default-ward-room.seed';

// ─── Standalone runner ────────────────────────────────────────────────────────
// Implementation lives in src/shared/seeds/ (Nest build sourceRoot = src);
// this file is the CLI entry point.
//
// Usage: npx ts-node prisma/seed-ward-room.ts <tenantId>

export { DEFAULT_ROOM_TYPES, DEFAULT_BED_AMENITIES, seedDefaultRoomTypes };

async function main() {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error('❌ Usage: npx ts-node prisma/seed-ward-room.ts <tenantId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const result = await seedDefaultRoomTypes(tenantId, prisma);
    if (result.seeded) {
      console.log(
        `✅ Seeded ${result.roomTypes} room types + ${result.amenities} bed amenities for tenant ${tenantId}`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has room types/amenities — skipped (idempotent)`,
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
