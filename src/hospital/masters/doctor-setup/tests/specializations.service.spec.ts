import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SpecializationsService } from '../services/specializations.service';
import { SpecializationsRepository } from '../repositories/specializations.repository';
import { ClinicalDepartmentsRepository } from '../repositories/clinical-departments.repository';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByDepartment: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  countLinkedDoctors: jest.fn(),
};

const mockDepartmentsRepo = {
  findById: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('SpecializationsService', () => {
  let service: SpecializationsService;

  const tenantId = 'tenant-uuid';
  const deptId = 'dept-uuid';
  const specId = 'spec-uuid';

  const department = { id: deptId, tenantId, name: 'Cardiology', code: 'CARD' };
  const specialization = {
    id: specId,
    tenantId,
    clinicalDepartmentId: deptId,
    name: 'Interventional Cardiology',
    code: 'INT_CARD',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecializationsService,
        { provide: SpecializationsRepository, useValue: mockRepository },
        {
          provide: ClinicalDepartmentsRepository,
          useValue: mockDepartmentsRepo,
        },
      ],
    }).compile();

    service = module.get<SpecializationsService>(SpecializationsService);
    jest.clearAllMocks();
  });

  it('creates a specialization under a valid department', async () => {
    mockDepartmentsRepo.findById.mockResolvedValue(department);
    mockRepository.create.mockResolvedValue(specialization);

    const result = await service.create(tenantId, {
      clinicalDepartmentId: deptId,
      name: 'Interventional Cardiology',
      code: 'INT_CARD',
    });

    expect(result.code).toBe('INT_CARD');
    expect(mockDepartmentsRepo.findById).toHaveBeenCalledWith(tenantId, deptId);
  });

  it('rejects a department from another tenant (404)', async () => {
    mockDepartmentsRepo.findById.mockResolvedValue(null);

    await expect(
      service.create(tenantId, {
        clinicalDepartmentId: deptId,
        name: 'X',
        code: 'X',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate code (P2002)', async () => {
    mockDepartmentsRepo.findById.mockResolvedValue(department);
    mockRepository.create.mockRejectedValue(p2002);

    await expect(
      service.create(tenantId, {
        clinicalDepartmentId: deptId,
        name: 'X',
        code: 'INT_CARD',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('by-department validates the department first', async () => {
    mockDepartmentsRepo.findById.mockResolvedValue(department);
    mockRepository.findByDepartment.mockResolvedValue([specialization]);

    const result = await service.findByDepartment(tenantId, deptId, true);

    expect(result).toHaveLength(1);
    expect(mockRepository.findByDepartment).toHaveBeenCalledWith(
      tenantId,
      deptId,
      true,
    );
  });

  it('blocks delete while doctors are linked', async () => {
    mockRepository.findById.mockResolvedValue(specialization);
    mockRepository.countLinkedDoctors.mockResolvedValue(1);

    await expect(service.remove(tenantId, specId)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepository.softDelete).not.toHaveBeenCalled();
  });
});
