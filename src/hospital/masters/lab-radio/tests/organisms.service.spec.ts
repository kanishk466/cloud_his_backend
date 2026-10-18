import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrganismsService } from '../services/organisms.service';
import { OrganismsRepository } from '../repositories/organisms.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  replacePanel: jest.fn(),
  getAstBattery: jest.fn(),
  findAntibioticsByIds: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('OrganismsService', () => {
  let service: OrganismsService;

  const tenantId = 'tenant-uuid';
  const organismId = 'org-ecoli';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganismsService,
        { provide: OrganismsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<OrganismsService>(OrganismsService);
    jest.clearAllMocks();
  });

  it('throws ConflictException on duplicate code (P2002)', async () => {
    mockRepo.create.mockRejectedValue(p2002);

    await expect(
      service.create(tenantId, { name: 'E. coli', code: 'ECOLI' }),
    ).rejects.toThrow(ConflictException);
  });

  // ─── PANEL SYNC ───────────────────────────────────────────────────────
  describe('syncAntibioticPanel', () => {
    const dto = {
      panel: [
        { antibioticId: 'ab-ak', isFirstLine: true },
        { antibioticId: 'ab-mem', isFirstLine: false },
      ],
    };

    it('replaces the panel after validating antibiotics', async () => {
      mockRepo.findById.mockResolvedValue({ id: organismId });
      mockRepo.findAntibioticsByIds.mockResolvedValue([
        { id: 'ab-ak' },
        { id: 'ab-mem' },
      ]);
      mockRepo.replacePanel.mockResolvedValue([
        { antibiotic: { code: 'AK' }, sortOrder: 0, isFirstLine: true },
        { antibiotic: { code: 'MEM' }, sortOrder: 1, isFirstLine: false },
      ]);

      const result = await service.syncAntibioticPanel(
        tenantId,
        organismId,
        dto,
      );

      expect(mockRepo.replacePanel).toHaveBeenCalledWith(organismId, dto.panel);
      expect(result.panel).toHaveLength(2);
    });

    it('rejects unknown antibiotics (400)', async () => {
      mockRepo.findById.mockResolvedValue({ id: organismId });
      mockRepo.findAntibioticsByIds.mockResolvedValue([{ id: 'ab-ak' }]);

      await expect(
        service.syncAntibioticPanel(tenantId, organismId, dto),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.replacePanel).not.toHaveBeenCalled();
    });
  });

  // ─── AST BATTERY ──────────────────────────────────────────────────────
  describe('getAstBattery', () => {
    it('splits first-line and reserve drugs', async () => {
      mockRepo.findById.mockResolvedValue({
        id: organismId,
        name: 'Escherichia coli',
        code: 'ECOLI',
      });
      mockRepo.getAstBattery.mockResolvedValue([
        { antibiotic: { code: 'AK' }, isFirstLine: true, sortOrder: 0 },
        { antibiotic: { code: 'CIP' }, isFirstLine: true, sortOrder: 1 },
        { antibiotic: { code: 'MEM' }, isFirstLine: false, sortOrder: 4 },
        { antibiotic: { code: 'CST' }, isFirstLine: false, sortOrder: 5 },
      ]);

      const result = await service.getAstBattery(tenantId, organismId);

      expect(result.organism.code).toBe('ECOLI');
      expect(result.firstLine.map((a) => a.code)).toEqual(['AK', 'CIP']);
      expect(result.secondLine.map((a) => a.code)).toEqual(['MEM', 'CST']);
    });

    it('throws 404 for unknown organism', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getAstBattery(tenantId, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
