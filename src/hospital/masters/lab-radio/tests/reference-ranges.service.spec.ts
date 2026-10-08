import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReferenceRangesService } from '../services/reference-ranges.service';
import { ReferenceRangesRepository } from '../repositories/reference-ranges.repository';

const mockRepo = {
  create: jest.fn(),
  replaceForObservation: jest.fn(),
  findForObservation: jest.fn(),
  findById: jest.fn(),
  remove: jest.fn(),
  findObservation: jest.fn(),
};

describe('ReferenceRangesService', () => {
  let service: ReferenceRangesService;

  const tenantId = 'tenant-uuid';
  const observationId = 'obs-uuid';

  const hgbRanges = [
    // Adult male (gender+age)
    {
      id: 'r-male',
      gender: 'MALE',
      minAgeYears: 18,
      maxAgeYears: null,
      minValue: 13,
      maxValue: 17,
    },
    // Adult female (gender+age)
    {
      id: 'r-female',
      gender: 'FEMALE',
      minAgeYears: 18,
      maxAgeYears: null,
      minValue: 12,
      maxValue: 15,
    },
    // Children (age-only, universal gender)
    {
      id: 'r-child',
      gender: null,
      minAgeYears: 0,
      maxAgeYears: 17,
      minValue: 11,
      maxValue: 13,
    },
    // Universal fallback
    {
      id: 'r-univ',
      gender: null,
      minAgeYears: null,
      maxAgeYears: null,
      minValue: 10,
      maxValue: 20,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceRangesService,
        { provide: ReferenceRangesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ReferenceRangesService>(ReferenceRangesService);
    jest.clearAllMocks();

    mockRepo.findObservation.mockResolvedValue({
      id: observationId,
      name: 'Hemoglobin',
      code: 'HGB',
    });
  });

  // ─── BULK CREATE ──────────────────────────────────────────────────────
  describe('bulkCreate', () => {
    it('replaces all ranges atomically', async () => {
      const ranges = [
        {
          gender: 'MALE' as const,
          minAgeYears: 18,
          minValue: 13,
          maxValue: 17,
        },
        {
          gender: 'FEMALE' as const,
          minAgeYears: 18,
          minValue: 12,
          maxValue: 15,
        },
      ];
      mockRepo.replaceForObservation.mockResolvedValue(ranges);

      const result = await service.bulkCreate(tenantId, {
        observationId,
        ranges,
      });

      expect(mockRepo.replaceForObservation).toHaveBeenCalledWith(
        tenantId,
        observationId,
        ranges,
      );
      expect(result).toHaveLength(2);
    });

    it('rejects inverted age bounds (400)', async () => {
      await expect(
        service.bulkCreate(tenantId, {
          observationId,
          ranges: [{ minAgeYears: 60, maxAgeYears: 18 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inverted value bounds (400)', async () => {
      await expect(
        service.bulkCreate(tenantId, {
          observationId,
          ranges: [{ minValue: 17, maxValue: 13 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown observation (404)', async () => {
      mockRepo.findObservation.mockResolvedValue(null);

      await expect(
        service.bulkCreate(tenantId, {
          observationId,
          ranges: [{ minValue: 1, maxValue: 2 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getApplicableRange (specificity matrix) ───────────────────────────
  describe('getApplicableRange', () => {
    beforeEach(() => {
      mockRepo.findForObservation.mockResolvedValue(hgbRanges);
    });

    it('male, 30 → exact gender+age match (r-male)', async () => {
      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        'MALE' as any,
        30,
      );
      expect(result?.id).toBe('r-male');
    });

    it('female, 25 → exact gender+age match (r-female)', async () => {
      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        'FEMALE' as any,
        25,
      );
      expect(result?.id).toBe('r-female');
    });

    it("male, 10 → age-only child range (gender-specific ranges don't fit age)", async () => {
      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        'MALE' as any,
        10,
      );
      expect(result?.id).toBe('r-child');
    });

    it('unknown gender, 45 → universal fallback', async () => {
      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        null,
        45,
      );
      expect(result?.id).toBe('r-univ');
    });

    it('gender OTHER, 30 → universal fallback (no OTHER-specific, adult age-only absent)', async () => {
      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        'OTHER' as any,
        30,
      );
      expect(result?.id).toBe('r-univ');
    });

    it('age unknown → gender-exact beats wildcard', async () => {
      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        'MALE' as any,
        null,
      );
      expect(result?.id).toBe('r-male');
    });

    it('returns null when no ranges exist', async () => {
      mockRepo.findForObservation.mockResolvedValue([]);

      const result = await service.getApplicableRange(
        tenantId,
        observationId,
        'MALE' as any,
        30,
      );
      expect(result).toBeNull();
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes an existing range', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'r-1' });
      mockRepo.remove.mockResolvedValue({});

      const result = await service.remove(tenantId, 'r-1');

      expect(result.message).toBe('Reference range deleted successfully');
    });

    it('throws NotFoundException when missing', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'r-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
