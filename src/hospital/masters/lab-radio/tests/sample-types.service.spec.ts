import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SampleTypesService } from '../services/sample-types.service';
import { SampleTypesRepository } from '../repositories/sample-types.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  countUsages: jest.fn(),
  findContainer: jest.fn(),
  findForWorklist: jest.fn(),
};

const EDTA = {
  id: 'c-edta',
  code: 'EDTA_PURPLE',
  name: 'EDTA Tube',
  capColor: 'Lavender',
  hexColorCode: '#9370DB',
  additive: 'K2 EDTA Anticoagulant',
  defaultVolumeMl: 2.0,
  tubeType: 'VACUTAINER',
};

const SST = {
  id: 'c-sst',
  code: 'SST_YELLOW',
  name: 'SST Gel Tube',
  capColor: 'Yellow/Gold',
  hexColorCode: '#FFD700',
  additive: 'Clot Activator & Gel Separator',
  defaultVolumeMl: 4.0,
  tubeType: 'VACUTAINER',
};

const FLUORIDE = {
  id: 'c-flu',
  code: 'FLUORIDE_GREY',
  name: 'Fluoride Glucose Tube',
  capColor: 'Grey',
  hexColorCode: '#808080',
  additive: 'Sodium Fluoride + Potassium Oxalate',
  defaultVolumeMl: 2.0,
  tubeType: 'VACUTAINER',
};

describe('SampleTypesService', () => {
  let service: SampleTypesService;

  const tenantId = 'tenant-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SampleTypesService,
        { provide: SampleTypesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SampleTypesService>(SampleTypesService);
    jest.clearAllMocks();
  });

  // ─── STABILITY CARD ────────────────────────────────────────────────────
  describe('getStabilityCard', () => {
    it('formats stability + retention summary', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'st-1',
        name: 'Serum',
        code: 'SER',
        defaultContainer: SST,
        storageTemp: 'REFRIGERATED',
        minVolumeMl: 2.0,
        stabilityRoomTempHours: 6,
        stabilityFridgeHours: 48,
        stabilityFrozenDays: 30,
        archiveDays: 7,
        collectionInstructions: null,
      });

      const card = await service.getStabilityCard(tenantId, 'st-1');

      expect(card.summary).toBe(
        'Stable 6h at room temp, 48h refrigerated (2-8°C), 30 days frozen (-20°C). Retain 7 day(s) post-report for re-testing.',
      );
      expect(card.minVolumeMl).toBe(2.0);
    });

    it('throws 404 for unknown sample type', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getStabilityCard(tenantId, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── COLLECTION WORKLIST ───────────────────────────────────────────────
  describe('getCollectionWorklistRequirements', () => {
    it('dedupes tubes — two tests on EDTA share ONE tube', async () => {
      mockRepo.findForWorklist.mockResolvedValue([
        {
          id: 'i1',
          name: 'CBC',
          code: 'CBC',
          fastingRequired: false,
          sampleContainerRel: EDTA,
          sampleTypeRel: null,
        },
        {
          id: 'i2',
          name: 'HbA1c',
          code: 'HBA1C',
          fastingRequired: false,
          sampleContainerRel: EDTA,
          sampleTypeRel: null,
        },
        {
          id: 'i3',
          name: 'Lipid Profile',
          code: 'LIPID',
          fastingRequired: true,
          sampleContainerRel: null,
          sampleTypeRel: {
            id: 'st-ser',
            name: 'Serum',
            code: 'SER',
            collectionInstructions: 'Overnight fast required',
            defaultContainer: SST,
          },
        },
        {
          id: 'i4',
          name: 'Liver Function Test',
          code: 'LFT',
          fastingRequired: true,
          sampleContainerRel: SST,
          sampleTypeRel: null,
        },
        {
          id: 'i5',
          name: 'Blood Sugar Fasting',
          code: 'BSF',
          fastingRequired: true,
          sampleContainerRel: FLUORIDE,
          sampleTypeRel: null,
        },
      ]);

      const result = await service.getCollectionWorklistRequirements(tenantId, [
        'i1',
        'i2',
        'i3',
        'i4',
        'i5',
      ]);

      expect(result.requiredTubes).toHaveLength(3);

      const edta = result.requiredTubes.find(
        (t) => t.container === 'EDTA_PURPLE',
      );
      expect(edta).toMatchObject({
        color: 'Lavender',
        tubeCount: 1,
        totalVolumeMl: 2.0,
        tests: ['CBC', 'HbA1c'],
      });

      const sst = result.requiredTubes.find(
        (t) => t.container === 'SST_YELLOW',
      );
      expect(sst).toMatchObject({
        tubeCount: 1,
        totalVolumeMl: 4.0,
        tests: ['Lipid Profile', 'Liver Function Test'],
      });

      const fluoride = result.requiredTubes.find(
        (t) => t.container === 'FLUORIDE_GREY',
      );
      expect(fluoride?.tests).toEqual(['Blood Sugar Fasting']);

      expect(result.fastingRequired).toBe(true);
      expect(result.specialInstructions[0]).toBe(
        'Ensure 8-12 hours overnight fasting',
      );
      expect(result.specialInstructions).toContain('Overnight fast required');
    });

    it('resolves container via sample type default when no direct link', async () => {
      mockRepo.findForWorklist.mockResolvedValue([
        {
          id: 'i3',
          name: 'Lipid Profile',
          code: 'LIPID',
          fastingRequired: false,
          sampleContainerRel: null,
          sampleTypeRel: {
            id: 'st-ser',
            name: 'Serum',
            code: 'SER',
            collectionInstructions: null,
            defaultContainer: SST,
          },
        },
      ]);

      const result = await service.getCollectionWorklistRequirements(tenantId, [
        'i3',
      ]);

      expect(result.requiredTubes).toHaveLength(1);
      expect(result.requiredTubes[0].container).toBe('SST_YELLOW');
    });

    it('collects unmapped tests into unassignedTests', async () => {
      mockRepo.findForWorklist.mockResolvedValue([
        {
          id: 'i9',
          name: 'Mystery Test',
          code: 'MYS',
          fastingRequired: false,
          sampleContainerRel: null,
          sampleTypeRel: null,
        },
      ]);

      const result = await service.getCollectionWorklistRequirements(tenantId, [
        'i9',
      ]);

      expect(result.requiredTubes).toHaveLength(0);
      expect(result.unassignedTests).toEqual(['Mystery Test']);
    });

    it('handles an empty order gracefully', async () => {
      mockRepo.findForWorklist.mockResolvedValue([]);

      const result = await service.getCollectionWorklistRequirements(
        tenantId,
        [],
      );

      expect(result.requiredTubes).toEqual([]);
      expect(result.fastingRequired).toBe(false);
    });
  });
});
