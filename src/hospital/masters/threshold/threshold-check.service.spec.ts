import { Test, TestingModule } from '@nestjs/testing';
import { ThresholdCheckService } from './threshold-check.service';
import { ThresholdRepository } from './threshold.repository';

const mockRepository = {
  findMatching: jest.fn(),
  findRoomType: jest.fn(),
};

describe('ThresholdCheckService', () => {
  let service: ThresholdCheckService;

  const tenantId = 'tenant-uuid';
  const panelId = 'panel-uuid';
  const roomTypeId = 'room-type-uuid';

  const hardThreshold = {
    id: 'th-1',
    maxAmount: 50000,
    alertAtPercent: 80,
    actionOnBreach: 'HARD',
    roomType: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThresholdCheckService,
        { provide: ThresholdRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ThresholdCheckService>(ThresholdCheckService);
    jest.clearAllMocks();
  });

  it('returns OK for self-pay patients (no panelId)', async () => {
    const result = await service.checkThreshold(tenantId, null, null, 999999);

    expect(result).toEqual({
      status: 'OK',
      message: 'Self-pay patient, no threshold',
    });
    expect(mockRepository.findMatching).not.toHaveBeenCalled();
  });

  it('returns OK when no threshold is configured', async () => {
    mockRepository.findMatching.mockResolvedValue(null);

    const result = await service.checkThreshold(
      tenantId,
      panelId,
      roomTypeId,
      60000,
    );

    expect(result.status).toBe('OK');
  });

  it('returns OK below the alert percentage', async () => {
    mockRepository.findMatching.mockResolvedValue(hardThreshold);

    const result = await service.checkThreshold(
      tenantId,
      panelId,
      roomTypeId,
      30000, // 60% of 50000
    );

    expect(result).toMatchObject({ status: 'OK', usagePercent: 60 });
  });

  it('returns ALERT at/above alertAtPercent but below 100%', async () => {
    mockRepository.findMatching.mockResolvedValue(hardThreshold);

    const result = await service.checkThreshold(
      tenantId,
      panelId,
      roomTypeId,
      42000, // 84%
    );

    expect(result).toMatchObject({
      status: 'ALERT',
      usagePercent: 84,
      maxAmount: 50000,
    });
  });

  it('returns WARNING at/above 100% with SOFT breach', async () => {
    mockRepository.findMatching.mockResolvedValue({
      ...hardThreshold,
      actionOnBreach: 'SOFT',
    });

    const result = await service.checkThreshold(
      tenantId,
      panelId,
      roomTypeId,
      55000, // 110%
    );

    expect(result).toMatchObject({
      status: 'WARNING',
      actionOnBreach: 'SOFT',
      usagePercent: 110,
    });
  });

  it('returns BLOCKED at/above 100% with HARD breach', async () => {
    mockRepository.findMatching.mockResolvedValue(hardThreshold);

    const result = await service.checkThreshold(
      tenantId,
      panelId,
      roomTypeId,
      50001, // just over
    );

    expect(result).toMatchObject({
      status: 'BLOCKED',
      actionOnBreach: 'HARD',
      maxAmount: 50000,
      currentBillTotal: 50001,
    });
  });

  it('getRoomRateCap combines room defaultRate with threshold', async () => {
    mockRepository.findRoomType.mockResolvedValue({
      id: roomTypeId,
      name: 'ICU',
      defaultRate: 8000,
    });
    mockRepository.findMatching.mockResolvedValue(hardThreshold);

    const result = await service.getRoomRateCap(tenantId, panelId, roomTypeId);

    expect(result).toEqual({
      roomTypeId,
      roomTypeName: 'ICU',
      dailyRate: 8000,
      maxAmount: 50000,
      alertAtPercent: 80,
    });
  });

  it('getRoomRateCap returns null for unknown room type', async () => {
    mockRepository.findRoomType.mockResolvedValue(null);

    const result = await service.getRoomRateCap(tenantId, panelId, roomTypeId);

    expect(result).toBeNull();
  });
});
