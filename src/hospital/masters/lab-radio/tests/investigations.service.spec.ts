import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvestigationsService } from '../services/investigations.service';
import { InvestigationsRepository } from '../repositories/investigations.repository';
import { ObservationsRepository } from '../repositories/observations.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findDetails: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  replaceObservations: jest.fn(),
  findService: jest.fn(),
  findLabDepartment: jest.fn(),
};

const mockObservationsRepo = {
  findByIds: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('InvestigationsService', () => {
  let service: InvestigationsService;

  const tenantId = 'tenant-uuid';
  const deptId = 'dept-uuid';
  const serviceId = 'service-uuid';

  const labService = {
    id: serviceId,
    serviceName: 'Lipid Profile',
    isActive: true,
    categoryRel: { code: 'DIAG' },
  };

  const dto = {
    labDepartmentId: deptId,
    serviceId,
    name: 'Lipid Profile',
    code: 'LIPID',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationsService,
        { provide: InvestigationsRepository, useValue: mockRepo },
        { provide: ObservationsRepository, useValue: mockObservationsRepo },
      ],
    }).compile();

    service = module.get<InvestigationsService>(InvestigationsService);
    jest.clearAllMocks();

    mockRepo.findService.mockResolvedValue(labService);
    mockRepo.findLabDepartment.mockResolvedValue({
      id: deptId,
      name: 'Biochemistry',
    });
  });

  // ─── CREATE ───────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates with valid service + department', async () => {
      mockRepo.create.mockResolvedValue({ id: 'inv-1', ...dto });

      const result = await service.create(tenantId, dto);

      expect(result.id).toBe('inv-1');
    });

    it('rejects unknown/inactive service (404)', async () => {
      mockRepo.findService.mockResolvedValue(null);

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('rejects inactive service (404)', async () => {
      mockRepo.findService.mockResolvedValue({
        ...labService,
        isActive: false,
      });

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects unknown lab department (404)', async () => {
      mockRepo.findLabDepartment.mockResolvedValue(null);

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a non-lab category service (400)', async () => {
      mockRepo.findService.mockResolvedValue({
        ...labService,
        categoryRel: { code: 'ROOM' },
      });

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows radiology-prefixed categories (RAD_*)', async () => {
      mockRepo.findService.mockResolvedValue({
        ...labService,
        categoryRel: { code: 'RAD_XRAY' },
      });
      mockRepo.create.mockResolvedValue({ id: 'inv-2', ...dto });

      const result = await service.create(tenantId, dto);
      expect(result.id).toBe('inv-2');
    });

    it('allows services with no category (cannot judge)', async () => {
      mockRepo.findService.mockResolvedValue({
        ...labService,
        categoryRel: null,
      });
      mockRepo.create.mockResolvedValue({ id: 'inv-3', ...dto });

      const result = await service.create(tenantId, dto);
      expect(result.id).toBe('inv-3');
    });

    it('throws ConflictException on duplicate code (P2002)', async () => {
      mockRepo.create.mockRejectedValue(p2002);

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── ASSIGN OBSERVATIONS ──────────────────────────────────────────────
  describe('assignObservations', () => {
    const assignDto = {
      observations: [
        { observationId: 'obs-1', sortOrder: 0 },
        { observationId: 'obs-2', sortOrder: 1, isMandatory: false },
      ],
    };

    it('replaces mappings atomically after validating observations', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'inv-1' });
      mockObservationsRepo.findByIds.mockResolvedValue([
        { id: 'obs-1' },
        { id: 'obs-2' },
      ]);
      mockRepo.replaceObservations.mockResolvedValue(['m1', 'm2']);

      const result = await service.assignObservations(
        tenantId,
        'inv-1',
        assignDto,
      );

      expect(mockRepo.replaceObservations).toHaveBeenCalledWith(
        'inv-1',
        assignDto.observations,
      );
      expect(result.observations).toHaveLength(2);
    });

    it('rejects unknown observations (400)', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'inv-1' });
      mockObservationsRepo.findByIds.mockResolvedValue([{ id: 'obs-1' }]);

      await expect(
        service.assignObservations(tenantId, 'inv-1', assignDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.replaceObservations).not.toHaveBeenCalled();
    });
  });
});
