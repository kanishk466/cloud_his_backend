import { PrismaClient, ServiceStoreType } from '@prisma/client';

// ─── DEFAULT SERVICE CATEGORY / SUB-CATEGORY TREE ────────────────────────────
// Given to every new tenant so billing can start from Day-1.
// Codes are stable — bulk imports and integrations reference them.

export interface DefaultSubCategory {
  code: string;
  name: string;
  printOrder: number;
}

export interface DefaultCategory {
  code: string;
  name: string;
  storeType: ServiceStoreType;
  sortOrder: number;
  subCategories: DefaultSubCategory[];
}

export const DEFAULT_SERVICE_TREE: DefaultCategory[] = [
  {
    code: 'DIAG',
    name: 'Diagnostics / Lab',
    storeType: ServiceStoreType.NONE,
    sortOrder: 1,
    subCategories: [
      { code: 'BIO', name: 'Biochemistry', printOrder: 1 },
      { code: 'HEM', name: 'Hematology', printOrder: 2 },
      { code: 'MIC', name: 'Microbiology', printOrder: 3 },
      { code: 'PAT', name: 'Pathology', printOrder: 4 },
      { code: 'SER', name: 'Serology / Immunology', printOrder: 5 },
    ],
  },
  {
    code: 'RAD',
    name: 'Radiology / Imaging',
    storeType: ServiceStoreType.NONE,
    sortOrder: 2,
    subCategories: [
      { code: 'XRY', name: 'X-Ray', printOrder: 1 },
      { code: 'USG', name: 'Ultrasound', printOrder: 2 },
      { code: 'CT', name: 'CT Scan', printOrder: 3 },
      { code: 'MRI', name: 'MRI', printOrder: 4 },
    ],
  },
  {
    code: 'CONS',
    name: 'Consultations',
    storeType: ServiceStoreType.NONE,
    sortOrder: 3,
    subCategories: [
      { code: 'OPD', name: 'OPD Consultation', printOrder: 1 },
      { code: 'IPD', name: 'IPD Consultation', printOrder: 2 },
      { code: 'TEL', name: 'Teleconsultation', printOrder: 3 },
    ],
  },
  {
    code: 'PROC',
    name: 'Procedures',
    storeType: ServiceStoreType.NONE,
    sortOrder: 4,
    subCategories: [
      { code: 'MOP', name: 'Minor OT Procedures', printOrder: 1 },
      { code: 'MJP', name: 'Major OT Procedures', printOrder: 2 },
      { code: 'END', name: 'Endoscopy', printOrder: 3 },
    ],
  },
  {
    code: 'ROOM',
    name: 'Room & Bed Charges',
    storeType: ServiceStoreType.NONE,
    sortOrder: 5,
    subCategories: [
      { code: 'GEN', name: 'General Ward', printOrder: 1 },
      { code: 'SEM', name: 'Semi-Private', printOrder: 2 },
      { code: 'PVT', name: 'Private Room', printOrder: 3 },
      { code: 'ICU', name: 'ICU / Critical Care', printOrder: 4 },
    ],
  },
  {
    code: 'NUR',
    name: 'Nursing Charges',
    storeType: ServiceStoreType.NONE,
    sortOrder: 6,
    subCategories: [
      { code: 'GNR', name: 'General Nursing', printOrder: 1 },
      { code: 'SPL', name: 'Special Nursing', printOrder: 2 },
    ],
  },
  {
    code: 'PHA',
    name: 'Pharmacy',
    storeType: ServiceStoreType.MEDICAL,
    sortOrder: 7,
    subCategories: [
      { code: 'TAB', name: 'Tablets & Capsules', printOrder: 1 },
      { code: 'INJ', name: 'Injections', printOrder: 2 },
      { code: 'SYR', name: 'Syrups & Liquids', printOrder: 3 },
      { code: 'SUR', name: 'Surgical Consumables', printOrder: 4 },
    ],
  },
  {
    code: 'GEN',
    name: 'General Store',
    storeType: ServiceStoreType.GENERAL,
    sortOrder: 8,
    subCategories: [
      { code: 'LIN', name: 'Linen & Laundry', printOrder: 1 },
      { code: 'DIE', name: 'Diet Charges', printOrder: 2 },
    ],
  },
];

export interface SeedTreeResult {
  seeded: boolean;
  categories: number;
  subCategories: number;
}

/**
 * Seeds the default category/sub-category tree for a tenant.
 * Idempotent: does nothing when the tenant already has at least one
 * ServiceCategoryMaster (never overwrites hospital customizations).
 *
 * Accepts any PrismaClient-compatible client (the Nest PrismaService
 * extends PrismaClient, so both work).
 */
export async function seedDefaultServiceTree(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedTreeResult> {
  return client.$transaction(
    async (tx) => {
      // Idempotency check inside the transaction (race-safe)
      const existing = await tx.serviceCategoryMaster.count({
        where: { tenantId },
      });
      if (existing > 0) {
        return { seeded: false, categories: 0, subCategories: 0 };
      }

      let subCategories = 0;

      for (const category of DEFAULT_SERVICE_TREE) {
        const created = await tx.serviceCategoryMaster.create({
          data: {
            tenantId,
            name: category.name,
            code: category.code,
            storeType: category.storeType,
            sortOrder: category.sortOrder,
          },
        });

        if (category.subCategories.length > 0) {
          await tx.serviceSubCategory.createMany({
            data: category.subCategories.map((sub) => ({
              tenantId,
              categoryId: created.id,
              name: sub.name,
              code: sub.code,
              printOrder: sub.printOrder,
            })),
          });
          subCategories += category.subCategories.length;
        }
      }

      return {
        seeded: true,
        categories: DEFAULT_SERVICE_TREE.length,
        subCategories,
      };
    },
    // 17 sequential writes on a remote pooler can exceed the 5s default
    { timeout: 30000 },
  );
}
