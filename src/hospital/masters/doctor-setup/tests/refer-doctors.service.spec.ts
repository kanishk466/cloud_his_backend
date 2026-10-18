import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReferDoctorsService } from '../services/refer-doctors.service';
import { ReferDoctorsRepository } from '../repositories/refer-doctors.repository';

const mockRepository = {
  generateCode: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  assignPro: jest.fn(),
  softDelete: jest.fn(),
  findProUser: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('ReferDoctorsService', () => {
  let service: ReferDoctorsService;

  const tenantId = 'tenant-uuid';
  const referDoctorId = 'ref-uuid';
  const proUserId = 'pro-user-uuid';

  const referDoctor = {
    id: referDoctorId,
    tenantId,
    name: 'Dr. Amit Shah',
    code: 'REF-0001',
    mobile: '9876500001',
    proUserId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferDoctorsService,
        { provide: ReferDoctorsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ReferDoctorsService>(ReferDoctorsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('auto-generates code when omitted', async () => {
      mockRepository.generateCode.mockResolvedValue('REF-0007');
      mockRepository.create.mockImplementation((_, data) =>
        Promise.resolve({ ...referDoctor, ...data }),
      );

      const result = await service.create(tenantId, {
        name: 'Dr. Amit Shah',
        mobile: '9876500001',
      });

      expect(mockRepository.generateCode).toHaveBeenCalledWith(tenantId);
      expect(result.code).toBe('REF-0007');
    });

    it('keeps a provided code', async () => {
      mockRepository.create.mockImplementation((_, data) =>
        Promise.resolve({ ...referDoctor, ...data }),
      );

      await service.create(tenantId, {
        name: 'Dr. Amit Shah',
        mobile: '9876500001',
        code: 'REF-CUSTOM',
      });

      expect(mockRepository.generateCode).not.toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ code: 'REF-CUSTOM' }),
      );
    });

    it('throws ConflictException on duplicate mobile (P2002)', async () => {
      mockRepository.create.mockRejectedValue(p2002);

      await expect(
        service.create(tenantId, {
          name: 'Dr. Amit Shah',
          mobile: '9876500001',
          code: 'REF-0001',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a PRO user from another tenant (404)', async () => {
      mockRepository.findProUser.mockResolvedValue(null);

      await expect(
        service.create(tenantId, {
          name: 'Dr. Amit Shah',
          mobile: '9876500001',
          proUserId,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('assignPro', () => {
    it('assigns a valid PRO user', async () => {
      mockRepository.findById.mockResolvedValue(referDoctor);
      mockRepository.findProUser.mockResolvedValue({
        id: proUserId,
        firstName: 'Ravi',
        lastName: 'Verma',
      });
      mockRepository.assignPro.mockResolvedValue({
        ...referDoctor,
        proUserId,
      });

      const result = await service.assignPro(
        tenantId,
        referDoctorId,
        proUserId,
      );

      expect(mockRepository.assignPro).toHaveBeenCalledWith(
        tenantId,
        referDoctorId,
        proUserId,
      );
      expect(result.proUserId).toBe(proUserId);
    });

    it('throws NotFoundException when refer doctor is missing', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.assignPro(tenantId, referDoctorId, proUserId),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.assignPro).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when PRO user is missing/inactive', async () => {
      mockRepository.findById.mockResolvedValue(referDoctor);
      mockRepository.findProUser.mockResolvedValue(null);

      await expect(
        service.assignPro(tenantId, referDoctorId, proUserId),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.assignPro).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft deletes', async () => {
      mockRepository.findById.mockResolvedValue(referDoctor);
      mockRepository.softDelete.mockResolvedValue(referDoctor);

      const result = await service.remove(tenantId, referDoctorId);

      expect(result.message).toBe('Refer doctor deleted successfully');
    });
  });
});
