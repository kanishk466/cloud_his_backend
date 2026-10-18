import { Test, TestingModule } from '@nestjs/testing';
import { WardRoomService } from '../services/ward-room.service';
import { BedsRepository } from '../repositories/beds.repository';
import { BedStatusRepository } from '../repositories/bed-status.repository';

const mockBedsRepo = {
  findAllForBor: jest.fn(),
};

const mockBedStatusRepo = {
  findCurrentByStatus: jest.fn(),
};

describe('WardRoomService (BOR dashboard)', () => {
  let service: WardRoomService;

  const tenantId = 'tenant-uuid';

  const makeBed = (
    roomTypeId: string,
    roomTypeName: string,
    isCount: boolean,
    gender: string,
    status: string,
    sortOrder = 1,
  ) => ({
    id: `${roomTypeId}-${status}-${Math.random()}`,
    room: {
      gender,
      roomType: { id: roomTypeId, name: roomTypeName, isCount, sortOrder },
    },
    statusHistory: [{ status }],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WardRoomService,
        { provide: BedsRepository, useValue: mockBedsRepo },
        { provide: BedStatusRepository, useValue: mockBedStatusRepo },
      ],
    }).compile();

    service = module.get<WardRoomService>(WardRoomService);
    jest.clearAllMocks();
  });

  it('computes BOR from countable beds only', async () => {
    mockBedsRepo.findAllForBor.mockResolvedValue([
      // GW (countable): 2 occupied, 1 available, 1 reserved
      makeBed('gw', 'General Ward', true, 'MALE_ONLY', 'OCCUPIED'),
      makeBed('gw', 'General Ward', true, 'MALE_ONLY', 'OCCUPIED'),
      makeBed('gw', 'General Ward', true, 'MALE_ONLY', 'AVAILABLE'),
      makeBed('gw', 'General Ward', true, 'FEMALE_ONLY', 'RESERVED'),
      // REC (NOT countable): occupied stretcher must NOT enter BOR
      makeBed('rec', 'Recovery Room', false, 'ANY', 'OCCUPIED'),
    ]);

    const result = await service.getBorDashboard(tenantId);

    expect(result.totalBeds).toBe(5);
    expect(result.countableBeds).toBe(4);
    expect(result.occupiedBeds).toBe(2);
    expect(result.availableBeds).toBe(1);
    expect(result.reservedBeds).toBe(1);
    expect(result.borPercent).toBe(50); // 2/4 × 100
  });

  it('groups by room type with per-type BOR', async () => {
    mockBedsRepo.findAllForBor.mockResolvedValue([
      ...Array.from({ length: 52 }, () =>
        makeBed('gw', 'General Ward', true, 'ANY', 'OCCUPIED'),
      ),
      ...Array.from({ length: 8 }, () =>
        makeBed('gw', 'General Ward', true, 'ANY', 'AVAILABLE'),
      ),
      ...Array.from({ length: 8 }, () =>
        makeBed('icu', 'ICU', true, 'ANY', 'OCCUPIED', 5),
      ),
      ...Array.from({ length: 2 }, () =>
        makeBed('icu', 'ICU', true, 'ANY', 'AVAILABLE', 5),
      ),
    ]);

    const result = await service.getBorDashboard(tenantId);

    const gw = result.byRoomType.find((t) => t.roomType === 'General Ward');
    const icu = result.byRoomType.find((t) => t.roomType === 'ICU');

    expect(gw).toMatchObject({ total: 60, occupied: 52, bor: 86.7 });
    expect(icu).toMatchObject({ total: 10, occupied: 8, bor: 80 });
    expect(result.borPercent).toBe(85.7); // 60/70
  });

  it('groups by gender ward', async () => {
    mockBedsRepo.findAllForBor.mockResolvedValue([
      makeBed('gw', 'General Ward', true, 'MALE_ONLY', 'OCCUPIED'),
      makeBed('gw', 'General Ward', true, 'MALE_ONLY', 'OCCUPIED'),
      makeBed('gw', 'General Ward', true, 'FEMALE_ONLY', 'AVAILABLE'),
      makeBed('gw', 'General Ward', true, 'ANY', 'OCCUPIED'),
    ]);

    const result = await service.getBorDashboard(tenantId);

    expect(result.byGender).toEqual(
      expect.arrayContaining([
        { gender: 'MALE_ONLY', total: 2, occupied: 2 },
        { gender: 'FEMALE_ONLY', total: 1, occupied: 0 },
        { gender: 'ANY', total: 1, occupied: 1 },
      ]),
    );
  });

  it('returns zero BOR when there are no beds', async () => {
    mockBedsRepo.findAllForBor.mockResolvedValue([]);

    const result = await service.getBorDashboard(tenantId);

    expect(result.borPercent).toBe(0);
    expect(result.countableBeds).toBe(0);
  });
});

describe('WardRoomService (housekeeping queue)', () => {
  let service: WardRoomService;
  const tenantId = 'tenant-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WardRoomService,
        { provide: BedsRepository, useValue: mockBedsRepo },
        { provide: BedStatusRepository, useValue: mockBedStatusRepo },
      ],
    }).compile();

    service = module.get<WardRoomService>(WardRoomService);
    jest.clearAllMocks();
  });

  it('returns the FIFO worklist with room context', async () => {
    mockBedStatusRepo.findCurrentByStatus.mockResolvedValue([
      {
        bedId: 'bed-1',
        effectiveFrom: new Date('2026-10-08T08:00:00Z'),
        reason: 'Deep cleaning',
        changedBy: 'user-1',
        bed: {
          bedIdentifier: 'GW-1/01',
          room: {
            roomNumber: 'GW-1',
            floor: '1st',
            wing: 'East',
            gender: 'MALE_ONLY',
            roomType: { id: 'gw', name: 'General Ward', code: 'GW' },
          },
        },
      },
      {
        bedId: 'bed-2',
        effectiveFrom: new Date('2026-10-08T09:30:00Z'),
        reason: null,
        changedBy: null,
        bed: {
          bedIdentifier: 'ICU-2/02',
          room: {
            roomNumber: 'ICU-2',
            floor: '2nd',
            wing: null,
            gender: 'ANY',
            roomType: { id: 'icu', name: 'ICU', code: 'ICU' },
          },
        },
      },
    ]);

    const result = await service.getHousekeepingQueue(tenantId);

    expect(mockBedStatusRepo.findCurrentByStatus).toHaveBeenCalledWith(
      tenantId,
      'HOUSEKEEPING',
    );
    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      bedId: 'bed-1',
      bedIdentifier: 'GW-1/01',
      roomNumber: 'GW-1',
      reason: 'Deep cleaning',
      roomType: { code: 'GW' },
    });
    expect(result.items[1].bedIdentifier).toBe('ICU-2/02');
  });

  it('returns an empty queue when nothing is pending', async () => {
    mockBedStatusRepo.findCurrentByStatus.mockResolvedValue([]);

    const result = await service.getHousekeepingQueue(tenantId);

    expect(result).toEqual({ total: 0, items: [] });
  });
});
