import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RateSchedulesService } from '../services/rate-schedules.service';
import { RateSchedulesRepository } from '../repositories/rate-schedules.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPanel: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findOverlapping: jest.fn(),
  findActiveForDate: jest.fn(),
  findDefault: jest.fn(),
  findPanel: jest.fn(),
  findTariff: jest.fn(),
};

describe('RateSchedulesService', () => {
  let service: RateSchedulesService;

  const tenantId = 'tenant-uuid';
  const panelId = 'panel-uuid';
  const tariffId = 'tariff-uuid';

  const dto = {
    panelId,
    tariffId,
    scheduleName: 'CGHS Rates 2024-2025',
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2024-12-31'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateSchedulesService,
        { provide: RateSchedulesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RateSchedulesService>(RateSchedulesService);
    jest.clearAllMocks();

    mockRepo.findPanel.mockResolvedValue({ id: panelId });
    mockRepo.findTariff.mockResolvedValue({ id: tariffId });
    mockRepo.findOverlapping.mockResolvedValue([]);
  });

  it('creates a non-overlapping schedule', async () => {
    mockRepo.create.mockResolvedValue({ id: 's-1', ...dto });

    const result = await service.create(tenantId, dto);

    expect(result.id).toBe('s-1');
  });

  it('rejects overlapping date ranges (400)', async () => {
    mockRepo.findOverlapping.mockResolvedValue([
      {
        scheduleName: 'CGHS Rates 2024',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-12-31'),
      },
    ]);

    await expect(
      service.create(tenantId, {
        ...dto,
        scheduleName: 'Conflicting',
        effectiveFrom: new Date('2024-06-01'),
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('rejects effectiveTo earlier than effectiveFrom', async () => {
    await expect(
      service.create(tenantId, {
        ...dto,
        effectiveFrom: new Date('2024-12-31'),
        effectiveTo: new Date('2024-01-01'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unknown panel / tariff (404)', async () => {
    mockRepo.findPanel.mockResolvedValue(null);
    await expect(service.create(tenantId, dto)).rejects.toThrow(
      NotFoundException,
    );

    mockRepo.findPanel.mockResolvedValue({ id: panelId });
    mockRepo.findTariff.mockResolvedValue(null);
    await expect(service.create(tenantId, dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update re-validates overlap against other schedules', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 's-1',
      panelId,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2024-12-31'),
    });
    mockRepo.findOverlapping.mockResolvedValue([
      {
        scheduleName: 'Other',
        effectiveFrom: new Date('2024-06-01'),
        effectiveTo: null,
      },
    ]);

    await expect(
      service.update(tenantId, 's-1', {
        effectiveFrom: new Date('2024-07-01'),
      }),
    ).rejects.toThrow(BadRequestException);

    // Excluding self: no overlap → passes
    mockRepo.findOverlapping.mockResolvedValue([]);
    mockRepo.update.mockResolvedValue({ id: 's-1' });
    await expect(
      service.update(tenantId, 's-1', { scheduleName: 'Renamed' }),
    ).resolves.toBeTruthy();
    expect(mockRepo.findOverlapping).toHaveBeenCalledWith(
      tenantId,
      panelId,
      new Date('2024-01-01'),
      new Date('2024-12-31'),
      's-1',
    );
  });
});
