import { PrismaClient } from '@prisma/client';

export interface SeedPackagesResult {
  seeded: boolean;
  packages: number;
  components: number;
  consults: number;
  exclusions: number;
}

/**
 * Seeds two reference packages with auto-SKUs:
 *   PKG-EHC      — Executive Health Checkup ₹2,999 (OPD, 30-day validity)
 *   PKG-LAP-CHOL — Laparoscopic Cholecystectomy ₹45,000 (IPD, 3 days GW)
 * Idempotent: skips when the tenant already has packages.
 * Graceful: components whose services don't exist yet are skipped
 * (run the lab seed first for the full experience).
 */
export async function seedDefaultPackages(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedPackagesResult> {
  const empty: SeedPackagesResult = {
    seeded: false,
    packages: 0,
    components: 0,
    consults: 0,
    exclusions: 0,
  };

  const existing = await client.packageMaster.count({ where: { tenantId } });
  if (existing > 0) return empty;

  return client.$transaction(
    async (tx) => {
      const again = await tx.packageMaster.count({ where: { tenantId } });
      if (again > 0) return empty;

      // Lookups (created by earlier seeds when present)
      const procCategory = await tx.serviceCategoryMaster.findFirst({
        where: { tenantId, code: 'PROC', deletedAt: null },
        select: { id: true },
      });
      const diagCategory = await tx.serviceCategoryMaster.findFirst({
        where: { tenantId, code: 'DIAG', deletedAt: null },
        select: { id: true },
      });
      const gwRoomType = await tx.roomType.findFirst({
        where: { tenantId, code: 'GW', deletedAt: null },
        select: { id: true },
      });

      const findServiceId = async (serviceCode: string) => {
        const s = await tx.serviceMaster.findFirst({
          where: { tenantId, serviceCode, deletedAt: null },
          select: { id: true },
        });
        return s?.id ?? null;
      };

      const findDeptId = async (name: string) => {
        const d = await tx.clinicalDepartment.findFirst({
          where: {
            tenantId,
            deletedAt: null,
            name: { contains: name, mode: 'insensitive' },
          },
          select: { id: true },
        });
        return d?.id ?? null;
      };

      const createPackageWithSku = async (input: {
        name: string;
        code: string;
        packageType: 'OPD_HEALTH_CHECK' | 'IPD_SURGERY';
        basePrice: number;
        validityDays?: number;
        roomTypeId?: string | null;
        includedStayDays?: number;
        description?: string;
        skuCategoryId: string | null;
        components: Array<{ serviceCode: string; quantity: number }>;
        consults: Array<{
          deptName?: string;
          consultType: 'OPD_VISIT' | 'IPD_DOCTOR_ROUND';
          maxVisits: number;
        }>;
        exclusions: string[];
      }) => {
        // Auto-SKU
        const sku = await tx.serviceMaster.upsert({
          where: {
            tenantId_serviceCode: { tenantId, serviceCode: input.code },
          },
          update: {},
          create: {
            tenantId,
            serviceCode: input.code,
            serviceName: input.name,
            baseRate: input.basePrice,
            itemType: 'PACKAGE',
            categoryId: input.skuCategoryId,
            rateEditable: true,
          },
        });

        const pkg = await tx.packageMaster.create({
          data: {
            tenantId,
            serviceId: sku.id,
            name: input.name,
            code: input.code,
            packageType: input.packageType,
            basePrice: input.basePrice,
            validityDays: input.validityDays ?? 30,
            roomTypeId: input.roomTypeId ?? null,
            includedStayDays: input.includedStayDays ?? 0,
            description: input.description,
          },
        });

        let components = 0;
        for (const [index, c] of input.components.entries()) {
          const serviceId = await findServiceId(c.serviceCode);
          if (!serviceId) continue; // graceful skip
          await tx.packageComponent.create({
            data: {
              tenantId,
              packageId: pkg.id,
              serviceId,
              quantity: c.quantity,
              sortOrder: index,
            },
          });
          components++;
        }

        let consults = 0;
        for (const c of input.consults) {
          const deptId = c.deptName ? await findDeptId(c.deptName) : null;
          await tx.packageDoctorConsult.create({
            data: {
              tenantId,
              packageId: pkg.id,
              clinicalDepartmentId: deptId,
              consultType: c.consultType,
              maxVisits: c.maxVisits,
            },
          });
          consults++;
        }

        for (const [index, text] of input.exclusions.entries()) {
          await tx.packageExclusion.create({
            data: {
              tenantId,
              packageId: pkg.id,
              exclusionText: text,
              sortOrder: index,
            },
          });
        }

        return { components, consults, exclusions: input.exclusions.length };
      };

      // ─── 1. Executive Health Checkup (OPD) ───────────────────────────────
      const ehc = await createPackageWithSku({
        name: 'Executive Health Checkup',
        code: 'PKG-EHC',
        packageType: 'OPD_HEALTH_CHECK',
        basePrice: 2999,
        validityDays: 30,
        description:
          'Annual executive screening: glucose, lipid profile, CBC + physician & cardiology consults.',
        skuCategoryId: diagCategory?.id ?? null,
        components: [
          { serviceCode: 'LAB-BSF', quantity: 1 },
          { serviceCode: 'LAB-LIPID', quantity: 1 },
          { serviceCode: 'LAB-CBC', quantity: 1 },
        ],
        consults: [
          {
            deptName: 'General Medicine',
            consultType: 'OPD_VISIT',
            maxVisits: 1,
          },
          { deptName: 'Cardiology', consultType: 'OPD_VISIT', maxVisits: 1 },
        ],
        exclusions: [
          'Specialized CT/MRI scans',
          'Medications and pharmacy items',
        ],
      });

      // ─── 2. Laparoscopic Cholecystectomy (IPD Surgery) ───────────────────
      const lapChol = await createPackageWithSku({
        name: 'Laparoscopic Cholecystectomy (Gallbladder Removal)',
        code: 'PKG-LAP-CHOL',
        packageType: 'IPD_SURGERY',
        basePrice: 45000,
        includedStayDays: 3,
        roomTypeId: gwRoomType?.id ?? null,
        description:
          'Surgical bundle: 3 days General Ward stay, OT charges, surgeon & anaesthesia, basic medicines up to ₹5,000, 2 CBC tests.',
        skuCategoryId: procCategory?.id ?? null,
        components: [
          { serviceCode: 'LAB-CBC', quantity: 2 },
          { serviceCode: 'LAB-BSF', quantity: 1 },
        ],
        consults: [
          {
            deptName: 'General Surgery',
            consultType: 'IPD_DOCTOR_ROUND',
            maxVisits: 3,
          },
        ],
        exclusions: [
          'Implants, Harmonic Scalpel / Stapler cartridges',
          'Cross-referral to ICU',
          'Blood transfusions',
        ],
      });

      return {
        seeded: true,
        packages: 2,
        components: ehc.components + lapChol.components,
        consults: ehc.consults + lapChol.consults,
        exclusions: ehc.exclusions + lapChol.exclusions,
      };
    },
    { timeout: 60000 },
  );
}
