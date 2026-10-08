import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_LAB_DEPARTMENTS,
  DEFAULT_REPORT_COMMENTS,
  DEFAULT_SAMPLE_CONTAINERS,
  DEFAULT_SAMPLE_TYPES,
  DEFAULT_ORGANISMS,
  DEFAULT_ANTIBIOTICS,
  DEFAULT_OUTSOURCE_LABS,
  seedDefaultLabSetup,
  seedDefaultTemplatesAndComments,
  seedDefaultContainersAndSampleTypes,
  seedDefaultMicrobiologyAndOutsource,
} from '../src/shared/seeds/default-lab-radio.seed';

// ─── Standalone runner ────────────────────────────────────────────────────────
// Usage: npx ts-node prisma/seed-lab-radio.ts <tenantId>

export {
  DEFAULT_LAB_DEPARTMENTS,
  DEFAULT_REPORT_COMMENTS,
  DEFAULT_SAMPLE_CONTAINERS,
  DEFAULT_SAMPLE_TYPES,
  DEFAULT_ORGANISMS,
  DEFAULT_ANTIBIOTICS,
  DEFAULT_OUTSOURCE_LABS,
  seedDefaultLabSetup,
  seedDefaultTemplatesAndComments,
  seedDefaultContainersAndSampleTypes,
  seedDefaultMicrobiologyAndOutsource,
};

async function main() {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error('❌ Usage: npx ts-node prisma/seed-lab-radio.ts <tenantId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const result = await seedDefaultLabSetup(tenantId, prisma);
    if (result.seeded) {
      console.log(
        `✅ Seeded ${result.labDepartments} lab departments, ${result.investigations} investigations, ${result.observations} observations, ${result.referenceRanges} reference ranges for tenant ${tenantId}`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has lab departments — skipped (idempotent)`,
      );
    }

    const s2 = await seedDefaultTemplatesAndComments(tenantId, prisma);
    if (s2.seeded) {
      console.log(
        `✅ Seeded ${s2.templates} report templates, ${s2.comments} comments, ${s2.interpretations} interpretation rules, ${s2.helps} help texts`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has report templates — skipped (idempotent)`,
      );
    }

    const s3 = await seedDefaultContainersAndSampleTypes(tenantId, prisma);
    if (s3.seeded) {
      console.log(
        `✅ Seeded ${s3.containers} containers, ${s3.sampleTypes} sample types, linked ${s3.linkedInvestigations} investigations`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has sample containers — skipped (idempotent)`,
      );
    }

    const s4 = await seedDefaultMicrobiologyAndOutsource(tenantId, prisma);
    if (s4.seeded) {
      console.log(
        `✅ Seeded ${s4.organisms} organisms, ${s4.antibiotics} antibiotics, ${s4.panelMappings} ECOLI panel mappings, ${s4.outsourceLabs} outsource labs`,
      );
    } else {
      console.log(
        `⏭️  Tenant ${tenantId} already has organisms — skipped (idempotent)`,
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
