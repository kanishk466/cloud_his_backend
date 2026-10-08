import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClinicalDepartmentsService } from '../services/clinical-departments.service';
import { ClinicalDepartmentsRepository } from '../repositories/clinical-departments.repository';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  countActiveSpecializations: jest.fn(),
  countLinkedDoctors: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('ClinicalDepartmentsService', () => {
  let service: ClinicalDepartmentsService;

  const tenantId = 'tenant-uuid';
  const deptId = 'dept-uuid';
  const department = { id: deptId, tenantId, name: 'Cardiology', code: 'CARD' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalDepartmentsService,
        { provide: ClinicalDepartmentsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ClinicalDepartmentsService>(
      ClinicalDepartmentsService,
    );
    jest.clearAllMocks();
  });

  it('creates a department', async () => {
    mockRepository.create.mockResolvedValue(department);

    const result = await service.create(tenantId, {
      name: 'Cardiology',
      code: 'CARD',
    });

    expect(result.code).toBe('CARD');
  });

  it('throws ConflictException on duplicate code (P2002)', async () => {
    mockRepository.create.mockRejectedValue(p2002);

    await expect(
      service.create(tenantId, { name: 'Cardio', code: 'CARD' }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when missing', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(service.findOne(tenantId, deptId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('soft deletes an unlinked department', async () => {
    mockRepository.findById.mockResolvedValue(department);
    mockRepository.countActiveSpecializations.mockResolvedValue(0);
    mockRepository.countLinkedDoctors.mockResolvedValue(0);
    mockRepository.softDelete.mockResolvedValue(department);

    const result = await service.remove(tenantId, deptId);

    expect(result.message).toBe('Clinical department deleted successfully');
    expect(mockRepository.softDelete).toHaveBeenCalledWith(tenantId, deptId);
  });

  it('blocks delete while specializations are linked', async () => {
    mockRepository.findById.mockResolvedValue(department);
    mockRepository.countActiveSpecializations.mockResolvedValue(3);
    mockRepository.countLinkedDoctors.mockResolvedValue(0);

    await expect(service.remove(tenantId, deptId)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepository.softDelete).not.toHaveBeenCalled();
  });

  it('blocks delete while doctors are linked', async () => {
    mockRepository.findById.mockResolvedValue(department);
    mockRepository.countActiveSpecializations.mockResolvedValue(0);
    mockRepository.countLinkedDoctors.mockResolvedValue(2);

    await expect(service.remove(tenantId, deptId)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepository.softDelete).not.toHaveBeenCalled();
  });
});
