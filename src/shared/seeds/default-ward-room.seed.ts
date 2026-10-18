import { PrismaClient } from '@prisma/client';

// ─── DEFAULT ROOM TYPES ───────────────────────────────────────────────────────
// Given to every new tenant so IPD setup starts from Day-1.
// Codes are stable — integrations and BOR dashboards reference them.

export interface DefaultRoomType {
  code: string;
  name: string;
  isEmergency: boolean;
  isDaycare: boolean;
  isDialysis: boolean;
  isCount: boolean;
  defaultRate: number;
  sortOrder: number;
}

export const DEFAULT_ROOM_TYPES: DefaultRoomType[] = [
  {
    code: 'GW',
    name: 'General Ward',
    isEmergency: false,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 800,
    sortOrder: 1,
  },
  {
    code: 'SP',
    name: 'Semi-Private',
    isEmergency: false,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 1500,
    sortOrder: 2,
  },
  {
    code: 'PVT',
    name: 'Private Room',
    isEmergency: false,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 3000,
    sortOrder: 3,
  },
  {
    code: 'PDLX',
    name: 'Private Deluxe',
    isEmergency: false,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 5000,
    sortOrder: 4,
  },
  {
    code: 'ICU',
    name: 'Intensive Care Unit',
    isEmergency: true,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 8000,
    sortOrder: 5,
  },
  {
    code: 'NICU',
    name: 'Neonatal ICU',
    isEmergency: true,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 10000,
    sortOrder: 6,
  },
  {
    code: 'PICU',
    name: 'Pediatric ICU',
    isEmergency: true,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 9000,
    sortOrder: 7,
  },
  {
    code: 'DC',
    name: 'Daycare',
    isEmergency: false,
    isDaycare: true,
    isDialysis: false,
    isCount: true,
    defaultRate: 2000,
    sortOrder: 8,
  },
  {
    code: 'DIAL',
    name: 'Dialysis',
    isEmergency: false,
    isDaycare: false,
    isDialysis: true,
    isCount: false,
    defaultRate: 3000,
    sortOrder: 9,
  },
  {
    code: 'REC',
    name: 'Recovery Room',
    isEmergency: true,
    isDaycare: false,
    isDialysis: false,
    isCount: false,
    defaultRate: 0,
    sortOrder: 10,
  },
  {
    code: 'EMER',
    name: 'Emergency Bed',
    isEmergency: true,
    isDaycare: false,
    isDialysis: false,
    isCount: true,
    defaultRate: 0,
    sortOrder: 11,
  },
];

export const DEFAULT_BED_AMENITIES: Array<{
  code: string;
  name: string;
  icon: string;
}> = [
  { code: 'AC', name: 'Air Conditioner', icon: 'snowflake' },
  { code: 'TV', name: 'Television', icon: 'tv' },
  { code: 'FRIDGE', name: 'Refrigerator', icon: 'refrigerator' },
  { code: 'ATTACHED_BATH', name: 'Attached Bathroom', icon: 'bath' },
  { code: 'SOFA', name: 'Sofa for Attendant', icon: 'sofa' },
  { code: 'OXYGEN', name: 'Oxygen Pipeline', icon: 'lungs' },
  { code: 'MONITOR', name: 'Cardiac Monitor', icon: 'heart-pulse' },
  { code: 'WIFI', name: 'Wi-Fi', icon: 'wifi' },
  { code: 'INTERCOM', name: 'Intercom', icon: 'phone' },
];

export interface SeedWardRoomResult {
  seeded: boolean;
  roomTypes: number;
  amenities: number;
}

/**
 * Seeds default room types + bed amenities for a tenant.
 * Idempotent: skips when the tenant already has room types or amenities
 * (never overwrites hospital customizations).
 */
export async function seedDefaultRoomTypes(
  tenantId: string,
  client: PrismaClient,
): Promise<SeedWardRoomResult> {
  return client.$transaction(
    async (tx) => {
      const existingTypes = await tx.roomType.count({ where: { tenantId } });
      const existingAmenities = await tx.bedAmenity.count({
        where: { tenantId },
      });

      let roomTypes = 0;
      let amenities = 0;

      if (existingTypes === 0) {
        await tx.roomType.createMany({
          data: DEFAULT_ROOM_TYPES.map((rt) => ({ ...rt, tenantId })),
          skipDuplicates: true,
        });
        roomTypes = DEFAULT_ROOM_TYPES.length;
      }

      if (existingAmenities === 0) {
        await tx.bedAmenity.createMany({
          data: DEFAULT_BED_AMENITIES.map((a) => ({ ...a, tenantId })),
          skipDuplicates: true,
        });
        amenities = DEFAULT_BED_AMENITIES.length;
      }

      return {
        seeded: roomTypes > 0 || amenities > 0,
        roomTypes,
        amenities,
      };
    },
    { timeout: 30000 },
  );
}
