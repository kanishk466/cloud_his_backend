import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { PatientsRepository } from '../patients.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Gender } from '../dto/create-patient.dto';

// Mock repository
const mockPatientsRepository = {
  findByMobile: jest.fn(),
  findByMobileAndFirstName: jest.fn(),
  findByAadhaar: jest.fn(),
  generateUhid: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByUhid: jest.fn(),
  search: jest.fn(),
  update: jest.fn(),
  getVisitHistory: jest.fn(),
};

const mockTx = {};
const mockPrisma = {
  $transaction: jest.fn((cb: any) => cb(mockTx)),
};

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PatientsRepository,
          useValue: mockPatientsRepository,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // --- REGISTER TESTS ---------------------------------------------
  describe('register', () => {
    const tenantId = 'tenant-uuid';
    const userId = 'user-uuid';

    const validDto = {
      firstName: 'Ramesh',
      lastName: 'Kumar',
      gender: Gender.MALE,
      mobile: '9876543210',
    };

    beforeEach(() => {
      mockPatientsRepository.findByMobileAndFirstName.mockResolvedValue(null);
      mockPatientsRepository.findByAadhaar.mockResolvedValue(null);
      mockPatientsRepository.generateUhid.mockResolvedValue('PT-2025-000001');
      mockPatientsRepository.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'patient-uuid', ...data }),
      );
    });

    it('should register new patient successfully', async () => {
      const result = await service.register(tenantId, validDto as any, userId);

      expect(result.uhid).toBe('PT-2025-000001');
      expect(
        mockPatientsRepository.findByMobileAndFirstName,
      ).toHaveBeenCalledWith(tenantId, validDto.mobile, validDto.firstName);
      expect(mockPatientsRepository.generateUhid).toHaveBeenCalledWith(
        tenantId,
        mockTx,
      );
      expect(mockPatientsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw PATIENT_DUPLICATE_RECORD if mobile AND first name already exist', async () => {
      mockPatientsRepository.findByMobileAndFirstName.mockResolvedValue({
        id: 'existing-id',
        uhid: 'PT-2025-000001',
      });

      await expect(
        service.register(tenantId, validDto as any, userId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PATIENT_DUPLICATE_RECORD' }),
      });
      await expect(
        service.register(tenantId, validDto as any, userId),
      ).rejects.toThrow(ConflictException);

      expect(mockPatientsRepository.generateUhid).not.toHaveBeenCalled();
      expect(mockPatientsRepository.create).not.toHaveBeenCalled();
    });

    it('should allow a family member with the same mobile but a different first name', async () => {
      // Duplicate check is keyed on mobile + first name, so no match here
      mockPatientsRepository.findByMobileAndFirstName.mockResolvedValue(null);

      const result = await service.register(
        tenantId,
        { ...validDto, firstName: 'Sunita' } as any,
        userId,
      );

      expect(result.uhid).toBe('PT-2025-000001');
      expect(mockPatientsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if Aadhaar already exists', async () => {
      mockPatientsRepository.findByAadhaar.mockResolvedValue({ id: 'x' });

      await expect(
        service.register(
          tenantId,
          { ...validDto, aadhaarNumber: '123412341234' } as any,
          userId,
        ),
      ).rejects.toThrow(ConflictException);
      expect(mockPatientsRepository.create).not.toHaveBeenCalled();
    });
  });
  // ─── FIND BY ID TESTS ─────────────────────────────────────────────
  describe('findById', () => {
    it('should return patient if found', async () => {
      const mockPatient = {
        id: 'p1',
        tenantId: 'tenant-1',
        uhid: 'PT-2025-000001',
        firstName: 'Test',
        status: 'ACTIVE',
        patientType: 'NEW',
        registeredAt: new Date(),
        gender: 'MALE',
        mobile: '9876543210',
      };

      mockPatientsRepository.findById.mockResolvedValue(mockPatient);

      const result = await service.findById('tenant-1', 'p1');
      expect(result.uhid).toBe('PT-2025-000001');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPatientsRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('tenant-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
