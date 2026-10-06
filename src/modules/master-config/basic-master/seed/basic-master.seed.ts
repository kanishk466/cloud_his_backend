/**
 * Basic Master seed (Phase 1.1 / 1.2) — aligned with DB design.
 *
 * - Geo (Country/State/District/City) is GLOBAL reference data.
 * - Bank, PatientDocument, DiscountReason, DiscountApproval are TENANT-scoped.
 *
 * Idempotent. Geo uses code-based lookups; tenant data is guarded by tenantId.
 */
import { PrismaClient, DocumentApplicableFor } from '@prisma/client';

interface CitySeed {
  name: string;
  code: string;
}
interface DistrictSeed {
  name: string;
  code: string;
  cities: CitySeed[];
}
interface StateSeed {
  name: string;
  code: string;
  districts: DistrictSeed[];
}

const GEO: Array<{
  countryName: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  isBaseCurrency: boolean;
  states: StateSeed[];
}> = [
  {
    countryName: 'India',
    countryCode: 'IN',
    currency: 'INR',
    currencySymbol: '₹',
    phoneCode: '+91',
    isBaseCurrency: true,
    states: [
      {
        name: 'Maharashtra',
        code: 'MH',
        districts: [
          {
            name: 'Pune',
            code: 'PUN',
            cities: [
              { name: 'Pune', code: 'PNE' },
              { name: 'Pimpri-Chinchwad', code: 'PMP' },
              { name: 'Baramati', code: 'BRM' },
            ],
          },
          {
            name: 'Mumbai',
            code: 'MUM',
            cities: [
              { name: 'Mumbai', code: 'MBM' },
              { name: 'Navi Mumbai', code: 'NVM' },
              { name: 'Thane', code: 'THN' },
            ],
          },
        ],
      },
      {
        name: 'Karnataka',
        code: 'KA',
        districts: [
          {
            name: 'Bengaluru Urban',
            code: 'BLR',
            cities: [
              { name: 'Bengaluru', code: 'BNG' },
              { name: 'Whitefield', code: 'WTF' },
            ],
          },
          { name: 'Mysuru', code: 'MYS', cities: [{ name: 'Mysuru', code: 'MSR' }] },
        ],
      },
      {
        name: 'Delhi',
        code: 'DL',
        districts: [
          {
            name: 'New Delhi',
            code: 'NDL',
            cities: [
              { name: 'New Delhi', code: 'NWD' },
              { name: 'Dwarka', code: 'DWK' },
            ],
          },
        ],
      },
      {
        name: 'Tamil Nadu',
        code: 'TN',
        districts: [
          {
            name: 'Chennai',
            code: 'CHN',
            cities: [
              { name: 'Chennai', code: 'CEN' },
              { name: 'Tambaram', code: 'TBM' },
            ],
          },
          { name: 'Coimbatore', code: 'CBE', cities: [{ name: 'Coimbatore', code: 'CBT' }] },
        ],
      },
      {
        name: 'Gujarat',
        code: 'GJ',
        districts: [
          {
            name: 'Ahmedabad',
            code: 'AMD',
            cities: [
              { name: 'Ahmedabad', code: 'AHD' },
              { name: 'Gandhinagar', code: 'GNR' },
            ],
          },
          { name: 'Surat', code: 'STV', cities: [{ name: 'Surat', code: 'SRT' }] },
        ],
      },
      {
        name: 'Uttar Pradesh',
        code: 'UP',
        districts: [
          {
            name: 'Lucknow',
            code: 'LKO',
            cities: [
              { name: 'Lucknow', code: 'LKN' },
              { name: 'Kanpur', code: 'KNP' },
            ],
          },
          { name: 'Varanasi', code: 'VNS', cities: [{ name: 'Varanasi', code: 'VRN' }] },
        ],
      },
    ],
  },
];

const BANKS: Array<{ name: string; mdrPercent: number }> = [
  { name: 'HDFC Bank', mdrPercent: 1.5 },
  { name: 'ICICI Bank', mdrPercent: 1.5 },
  { name: 'State Bank of India', mdrPercent: 1.2 },
  { name: 'Axis Bank', mdrPercent: 1.5 },
  { name: 'Kotak Mahindra Bank', mdrPercent: 1.6 },
  { name: 'Punjab National Bank', mdrPercent: 1.2 },
  { name: 'Bank of Baroda', mdrPercent: 1.25 },
  { name: 'Yes Bank', mdrPercent: 1.75 },
];

const PATIENT_DOCUMENTS: Array<{
  name: string;
  isMandatory: boolean;
  applicableFor: DocumentApplicableFor;
  allowedFileTypes: string[];
}> = [
  { name: 'Aadhaar Card', isMandatory: true, applicableFor: 'BOTH', allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'] },
  { name: 'PAN Card', isMandatory: false, applicableFor: 'BOTH', allowedFileTypes: ['pdf', 'jpg', 'png'] },
  { name: 'Insurance Card', isMandatory: false, applicableFor: 'BOTH', allowedFileTypes: ['pdf', 'jpg', 'png'] },
  { name: 'Referral Letter', isMandatory: false, applicableFor: 'OPD', allowedFileTypes: ['pdf', 'jpg', 'png'] },
  { name: 'Previous Discharge Summary', isMandatory: false, applicableFor: 'IPD', allowedFileTypes: ['pdf'] },
  { name: 'Passport Size Photo', isMandatory: false, applicableFor: 'BOTH', allowedFileTypes: ['jpg', 'jpeg', 'png'] },
];

// ── GLOBAL geo ────────────────────────────────────────────────────
async function seedGeo(prisma: PrismaClient) {
  for (const c of GEO) {
    let country = await prisma.country.findUnique({
      where: { countryCode: c.countryCode },
    });
    if (!country) {
      country = await prisma.country.create({
        data: {
          countryCode: c.countryCode,
          countryName: c.countryName,
          currency: c.currency,
          currencySymbol: c.currencySymbol,
          phoneCode: c.phoneCode,
          isBaseCurrency: c.isBaseCurrency,
          isActive: true,
        },
      });
      console.log(`  + Country: ${c.countryName}`);
    }

    for (const s of c.states) {
      let state = await prisma.state.findFirst({
        where: { countryId: country.id, stateCode: s.code },
      });
      if (!state) {
        state = await prisma.state.create({
          data: {
            countryId: country.id,
            stateCode: s.code,
            stateName: s.name,
            isActive: true,
          },
        });
        console.log(`    + State: ${s.name}`);
      }

      for (const d of s.districts) {
        let district = await prisma.district.findFirst({
          where: { stateId: state.id, districtCode: d.code },
        });
        if (!district) {
          district = await prisma.district.create({
            data: {
              stateId: state.id,
              districtCode: d.code,
              districtName: d.name,
              isActive: true,
            },
          });
          console.log(`      + District: ${d.name}`);
        }

        for (const city of d.cities) {
          const existing = await prisma.city.findFirst({
            where: { districtId: district.id, cityCode: city.code },
          });
          if (!existing) {
            await prisma.city.create({
              data: {
                districtId: district.id,
                cityCode: city.code,
                cityName: city.name,
                isActive: true,
              },
            });
            console.log(`        + City: ${city.name}`);
          }
        }
      }
    }
  }
}

/** Seeds GLOBAL geo only. */
export async function seedBasicMaster(prisma: PrismaClient) {
  console.log('\n📌 Seeding Basic Master geo (global)...');
  await seedGeo(prisma);
  console.log('  ✅ Basic Master geo complete.');
}

// ── TENANT-scoped data ────────────────────────────────────────────
export async function seedBanksForTenant(prisma: PrismaClient, tenantId: string) {
  for (const b of BANKS) {
    const existing = await prisma.bank.findFirst({
      where: { tenantId, bankName: b.name, deletedAt: null },
    });
    if (!existing) {
      await prisma.bank.create({
        data: { tenantId, bankName: b.name, mdrPercent: b.mdrPercent, isActive: true },
      });
      console.log(`  + Bank: ${b.name}`);
    }
  }
}

export async function seedPatientDocumentsForTenant(prisma: PrismaClient, tenantId: string) {
  for (const doc of PATIENT_DOCUMENTS) {
    const existing = await prisma.patientDocument.findFirst({
      where: { tenantId, documentName: doc.name, deletedAt: null },
    });
    if (!existing) {
      await prisma.patientDocument.create({
        data: {
          tenantId,
          documentName: doc.name,
          isMandatory: doc.isMandatory,
          applicableFor: doc.applicableFor,
          allowedFileTypes: doc.allowedFileTypes,
          isActive: true,
        },
      });
      console.log(`  + Patient Document: ${doc.name}`);
    }
  }
}

const DISCOUNT_REASONS: Array<{
  code: string;
  reason: string;
  applicableType: 'OPD' | 'IPD' | 'BOTH';
  defaultDiscountPct?: number;
  approvalThresholdPct: number;
  requiresApproval: boolean;
}> = [
  { code: 'CAMP', reason: 'Camp Discount', applicableType: 'BOTH', defaultDiscountPct: 10, approvalThresholdPct: 10, requiresApproval: false },
  { code: 'MGMT', reason: 'Management Discount', applicableType: 'BOTH', defaultDiscountPct: 5, approvalThresholdPct: 10, requiresApproval: false },
  { code: 'STAFF', reason: 'Staff Discount', applicableType: 'BOTH', defaultDiscountPct: 20, approvalThresholdPct: 20, requiresApproval: true },
  { code: 'PANEL', reason: 'Panel Discount', applicableType: 'BOTH', defaultDiscountPct: 5, approvalThresholdPct: 15, requiresApproval: false },
  { code: 'CORP', reason: 'Corporate Discount', applicableType: 'BOTH', defaultDiscountPct: 5, approvalThresholdPct: 15, requiresApproval: false },
];

const DISCOUNT_APPROVALS: Array<{
  code: string;
  authorityName: string;
  applicableType: 'OPD' | 'IPD' | 'BOTH';
  maxDiscountPct: number;
  isUnlimited: boolean;
  priority: number;
}> = [
  { code: 'FRONT_DESK', authorityName: 'Front Desk', applicableType: 'BOTH', maxDiscountPct: 5, isUnlimited: false, priority: 1 },
  { code: 'DUTY_DOCTOR', authorityName: 'Duty Doctor', applicableType: 'BOTH', maxDiscountPct: 10, isUnlimited: false, priority: 2 },
  { code: 'HOD', authorityName: 'HOD', applicableType: 'BOTH', maxDiscountPct: 20, isUnlimited: false, priority: 3 },
  { code: 'MED_SUPER', authorityName: 'Medical Superintendent', applicableType: 'BOTH', maxDiscountPct: 50, isUnlimited: false, priority: 4 },
  { code: 'DIRECTOR', authorityName: 'Director', applicableType: 'BOTH', maxDiscountPct: 0, isUnlimited: true, priority: 5 },
];

export async function seedDiscountsForTenant(prisma: PrismaClient, tenantId: string) {
  for (const r of DISCOUNT_REASONS) {
    const existing = await prisma.discountReason.findFirst({
      where: { tenantId, code: r.code, deletedAt: null },
    });
    if (!existing) {
      await prisma.discountReason.create({
        data: {
          tenantId,
          code: r.code,
          reason: r.reason,
          applicableType: r.applicableType,
          defaultDiscountPct: r.defaultDiscountPct,
          approvalThresholdPct: r.approvalThresholdPct,
          requiresApproval: r.requiresApproval,
          isActive: true,
        },
      });
      console.log(`  + DiscountReason: ${r.reason}`);
    }
  }

  for (const a of DISCOUNT_APPROVALS) {
    const existing = await prisma.discountApproval.findFirst({
      where: { tenantId, code: a.code, deletedAt: null },
    });
    if (!existing) {
      await prisma.discountApproval.create({
        data: {
          tenantId,
          code: a.code,
          authorityName: a.authorityName,
          applicableType: a.applicableType,
          maxDiscountPct: a.maxDiscountPct,
          isUnlimited: a.isUnlimited,
          requiresReason: true,
          priority: a.priority,
          isActive: true,
        },
      });
      console.log(`  + DiscountApproval: ${a.authorityName}`);
    }
  }
}
