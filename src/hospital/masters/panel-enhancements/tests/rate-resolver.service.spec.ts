import { Test, TestingModule } from '@nestjs/testing';
import { RateResolverService } from '../services/rate-resolver.service';
import { RateSchedulesRepository } from '../repositories/rate-schedules.repository';

const mockRepo = {
  findActiveForDate: jest.fn(),
  findDefault: jest.fn(),
  findPanel: jest.fn(),
};

describe('RateResolverService', () => {
  let service: RateResolverService;

  const tenantId = 'tenant-uuid';
  const panelId = 'panel-uuid';

  const tariffA2024 = {
    tariffId: 'tariff-A',
    scheduleName: 'CGHS Rates 2024-2025',
  };
  const tariffB2026 = {
    tariffId: 'tariff-B',
    scheduleName: 'CGHS Rates 2026',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateResolverService,
        { provide: RateSchedulesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RateResolverService>(RateResolverService);
    jest.clearAllMocks();
  });

  it('resolves the schedule covering the bill date (2024 → Tariff A)', async () => {
    mockRepo.findActiveForDate.mockResolvedValue(tariffA2024);

    const result = await service.resolveActiveTariff(
      tenantId,
      panelId,
      new Date('2024-06-15'),
    );

    expect(result).toEqual({
      tariffId: 'tariff-A',
      scheduleName: 'CGHS Rates 2024-2025',
      resolvedFrom: 'DATE_MATCH',
      rateMultiplier: 1,
    });
    expect(mockRepo.findDefault).not.toHaveBeenCalled();
  });

  it('resolves the newer schedule for a 2026 bill date (Tariff B)', async () => {
    mockRepo.findActiveForDate.mockResolvedValue(tariffB2026);

    const result = await service.resolveActiveTariff(
      tenantId,
      panelId,
      new Date('2026-03-01'),
    );

    expect(result?.tariffId).toBe('tariff-B');
    expect(result?.resolvedFrom).toBe('DATE_MATCH');
  });

  it('falls back to the default schedule when no date matches', async () => {
    mockRepo.findActiveForDate.mockResolvedValue(null);
    mockRepo.findDefault.mockResolvedValue({
      tariffId: 'tariff-default',
      scheduleName: 'Panel base schedule',
    });

    const result = await service.resolveActiveTariff(
      tenantId,
      panelId,
      new Date('2020-01-01'),
    );

    expect(result).toMatchObject({
      tariffId: 'tariff-default',
      resolvedFrom: 'DEFAULT_SCHEDULE',
    });
  });

  it('falls back to panel OPD tariff when no schedule exists at all', async () => {
    mockRepo.findActiveForDate.mockResolvedValue(null);
    mockRepo.findDefault.mockResolvedValue(null);
    mockRepo.findPanel.mockResolvedValue({
      id: panelId,
      panelName: 'CGHS',
      opdTariffId: 'tariff-opd',
      ipdTariffId: 'tariff-ipd',
    });

    const result = await service.resolveActiveTariff(tenantId, panelId);

    expect(result).toMatchObject({
      tariffId: 'tariff-opd',
      resolvedFrom: 'PANEL_TARIFF',
    });
  });

  it('prefers IPD tariff in IPD context', async () => {
    mockRepo.findActiveForDate.mockResolvedValue(null);
    mockRepo.findDefault.mockResolvedValue(null);
    mockRepo.findPanel.mockResolvedValue({
      id: panelId,
      panelName: 'CGHS',
      opdTariffId: 'tariff-opd',
      ipdTariffId: 'tariff-ipd',
    });

    const result = await service.resolveActiveTariff(
      tenantId,
      panelId,
      new Date(),
      'IPD',
    );

    expect(result?.tariffId).toBe('tariff-ipd');
  });

  it('returns null when panel has no tariff configured', async () => {
    mockRepo.findActiveForDate.mockResolvedValue(null);
    mockRepo.findDefault.mockResolvedValue(null);
    mockRepo.findPanel.mockResolvedValue({
      id: panelId,
      panelName: 'Empty',
      opdTariffId: null,
      ipdTariffId: null,
    });

    const result = await service.resolveActiveTariff(tenantId, panelId);

    expect(result).toBeNull();
  });
});
