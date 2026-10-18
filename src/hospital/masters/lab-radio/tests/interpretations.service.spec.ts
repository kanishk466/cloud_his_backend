import { Test, TestingModule } from '@nestjs/testing';
import { InterpretationsService } from '../services/interpretations.service';
import { InterpretationsRepository } from '../repositories/interpretations.repository';
import { ReferenceRangesService } from '../services/reference-ranges.service';

const mockRepo = {
  create: jest.fn(),
  replaceForObservation: jest.fn(),
  findForObservation: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findObservation: jest.fn(),
};

const mockRangesService = {
  getApplicableRange: jest.fn(),
};

const makeRule = (
  condition: string,
  text: string,
  severity: string,
  extra: any = {},
) => ({
  id: `rule-${condition}`,
  condition,
  interpretationText: text,
  severity,
  thresholdValue: extra.thresholdValue ?? null,
  thresholdText: extra.thresholdText ?? null,
});

describe('InterpretationsService (engine)', () => {
  let service: InterpretationsService;

  const tenantId = 'tenant-uuid';
  const observationId = 'obs-tchol';

  // TCHOL adult male range: 125–200, criticalHigh 240
  const range = {
    minValue: 125,
    maxValue: 200,
    criticalLow: null,
    criticalHigh: 240,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterpretationsService,
        { provide: InterpretationsRepository, useValue: mockRepo },
        { provide: ReferenceRangesService, useValue: mockRangesService },
      ],
    }).compile();

    service = module.get<InterpretationsService>(InterpretationsService);
    jest.clearAllMocks();

    mockRangesService.getApplicableRange.mockResolvedValue(range);
  });

  it('ABOVE_MAX fires when value > maxValue', async () => {
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('ABOVE_MAX', 'Elevated cholesterol', 'WARNING'),
      makeRule('IN_RANGE', 'Normal', 'INFO'),
    ]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      210,
      'MALE' as any,
      30,
    );

    expect(result).toHaveLength(1);
    expect(result[0].interpretationText).toBe('Elevated cholesterol');
  });

  it('IN_RANGE fires for a normal value', async () => {
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('IN_RANGE', 'Within normal limits', 'INFO'),
    ]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      150,
      'MALE' as any,
      30,
    );

    expect(result).toHaveLength(1);
  });

  it('CRITICAL sorts before WARNING', async () => {
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('ABOVE_MAX', 'Elevated', 'WARNING'),
      makeRule('ABOVE_CRITICAL_HIGH', 'CRITICAL: severe', 'CRITICAL'),
    ]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      260,
      'MALE' as any,
      30,
    );

    expect(result).toHaveLength(2);
    expect(result[0].severity).toBe('CRITICAL');
    expect(result[1].severity).toBe('WARNING');
  });

  it('BELOW_MIN and BELOW_CRITICAL_LOW fire on low values', async () => {
    mockRangesService.getApplicableRange.mockResolvedValue({
      ...range,
      criticalLow: 100,
    });
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('BELOW_MIN', 'Low', 'WARNING'),
      makeRule('BELOW_CRITICAL_LOW', 'CRITICAL low', 'CRITICAL'),
    ]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      90,
      'MALE' as any,
      30,
    );

    expect(result.map((r) => r.severity)).toEqual(['CRITICAL', 'WARNING']);
  });

  it('CONTAINS matches text case-insensitively', async () => {
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('CONTAINS', 'Growth detected', 'WARNING', {
        thresholdText: 'growth',
      }),
    ]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      'Moderate GROWTH of E. coli',
      null,
      null,
    );

    expect(result).toHaveLength(1);
  });

  it('EQUALS matches exact numeric value', async () => {
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('EQUALS', 'Exactly at cutoff', 'INFO', { thresholdValue: 126 }),
    ]);

    const hit = await service.evaluateInterpretations(
      tenantId,
      observationId,
      126,
      null,
      null,
    );
    const miss = await service.evaluateInterpretations(
      tenantId,
      observationId,
      125,
      null,
      null,
    );

    expect(hit).toHaveLength(1);
    expect(miss).toHaveLength(0);
  });

  it('range-based rules cannot match when no range exists', async () => {
    mockRangesService.getApplicableRange.mockResolvedValue(null);
    mockRepo.findForObservation.mockResolvedValue([
      makeRule('ABOVE_MAX', 'Elevated', 'WARNING'),
    ]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      9999,
      null,
      null,
    );

    expect(result).toHaveLength(0);
  });

  it('returns empty when no rules configured', async () => {
    mockRepo.findForObservation.mockResolvedValue([]);

    const result = await service.evaluateInterpretations(
      tenantId,
      observationId,
      500,
      null,
      null,
    );

    expect(result).toEqual([]);
  });

  it('bulkCreate validates observation and replaces atomically', async () => {
    mockRepo.findObservation.mockResolvedValue({ id: observationId });
    mockRepo.replaceForObservation.mockResolvedValue(['r1', 'r2']);

    const result = await service.bulkCreate(tenantId, {
      observationId,
      interpretations: [
        {
          condition: 'ABOVE_MAX' as any,
          interpretationText: 'High',
          severity: 'WARNING',
        },
        {
          condition: 'BELOW_MIN' as any,
          interpretationText: 'Low',
          severity: 'WARNING',
        },
      ],
    });

    expect(result).toHaveLength(2);
  });
});
