import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../services/templates.service';
import { TemplatesRepository } from '../repositories/templates.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  resolve: jest.fn(),
  setDefault: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findLabDepartment: jest.fn(),
  findInvestigation: jest.fn(),
};

describe('TemplatesService', () => {
  let service: TemplatesService;

  const tenantId = 'tenant-uuid';
  const investigationId = 'inv-uuid';
  const deptId = 'dept-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: TemplatesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    jest.clearAllMocks();

    mockRepo.findInvestigation.mockResolvedValue({
      id: investigationId,
      labDepartmentId: deptId,
    });
  });

  // ─── RESOLUTION CHAIN ─────────────────────────────────────────────────
  describe('resolve', () => {
    it('returns investigation-specific template first', async () => {
      mockRepo.resolve.mockResolvedValue({
        template: { id: 't-inv', name: 'Lipid Custom' },
        resolvedFrom: 'INVESTIGATION',
      });

      const result = await service.resolve(tenantId, investigationId);

      expect(result.resolvedFrom).toBe('INVESTIGATION');
      expect(mockRepo.resolve).toHaveBeenCalledWith(
        tenantId,
        investigationId,
        deptId,
      );
    });

    it('falls back to department default', async () => {
      mockRepo.resolve.mockResolvedValue({
        template: { id: 't-dept', name: 'Biochemistry Standard' },
        resolvedFrom: 'DEPARTMENT',
      });

      const result = await service.resolve(tenantId, investigationId);

      expect(result.resolvedFrom).toBe('DEPARTMENT');
    });

    it('falls back to global default', async () => {
      mockRepo.resolve.mockResolvedValue({
        template: { id: 't-global', name: 'Standard Lab Report' },
        resolvedFrom: 'GLOBAL',
      });

      const result = await service.resolve(tenantId, investigationId);

      expect(result.resolvedFrom).toBe('GLOBAL');
    });

    it('throws 404 when no template exists anywhere', async () => {
      mockRepo.resolve.mockResolvedValue({
        template: null,
        resolvedFrom: null,
      });

      await expect(service.resolve(tenantId, investigationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 for unknown investigation', async () => {
      mockRepo.findInvestigation.mockResolvedValue(null);

      await expect(service.resolve(tenantId, investigationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── SET DEFAULT ──────────────────────────────────────────────────────
  describe('setDefault', () => {
    it('marks the template as default', async () => {
      mockRepo.setDefault.mockResolvedValue({ id: 't-1', isDefault: true });

      const result = await service.setDefault(tenantId, 't-1');

      expect(result.isDefault).toBe(true);
    });

    it('throws 404 when missing', async () => {
      mockRepo.setDefault.mockResolvedValue(null);

      await expect(service.setDefault(tenantId, 't-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── CREATE scope validation ───────────────────────────────────────────
  describe('create', () => {
    it('validates department + investigation scope', async () => {
      mockRepo.findLabDepartment.mockResolvedValue({ id: deptId });
      mockRepo.create.mockResolvedValue({ id: 't-1' });

      await service.create(tenantId, {
        labDepartmentId: deptId,
        investigationId,
        name: 'Custom',
      });

      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('rejects investigation from a different department (400)', async () => {
      mockRepo.findLabDepartment.mockResolvedValue({ id: 'other-dept' });
      mockRepo.findInvestigation.mockResolvedValue({
        id: investigationId,
        labDepartmentId: deptId,
      });

      await expect(
        service.create(tenantId, {
          labDepartmentId: 'other-dept',
          investigationId,
          name: 'Custom',
        }),
      ).rejects.toThrow(
        'Investigation does not belong to the given lab department',
      );
    });
  });
});
