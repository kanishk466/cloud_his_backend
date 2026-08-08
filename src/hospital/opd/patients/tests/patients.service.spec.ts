import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { PatientsRepository } from '../patients.repository';
import { Gender } from '../dto/create-patient.dto';

// Mock repository
const mockPatientsRepository = {
  findByMobile: jest.fn(),
  findByAadhaar: jest.fn(),
  generateUhid: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByUhid: jest.fn(),
  search: jest.fn(),
  update: jest.fn(),
  getVisitHistory: jest.fn(),
};

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
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

  // ─── REGISTER TESTS ───────────────────────────────────────────────
  describe('register', () => {
    const tenantId = 'tenant-uuid';
    const userId = 'user-uuid';

    const validDto = {
      firstName: 'Ramesh',
      lastName: 'Kumar',
      gender: Gender.MALE,
      mobile: '9876543210',
    };

    it('should register new patient successfully', async () => {
      // Arrange
      mockPatientsRepository.findByMobile.mockResolvedValue(null);
      mockPatientsRepository.generateUhid.mockResolvedValue(
        'PT-2025-000001',
      );
      mockPatientsRepository.create.mockResolvedValue({
        id: 'patient-uuid',
        uhid: 'PT-2025-000001',
        tenantId,
        ...validDto,
        patientType: 'NEW',
        status: 'ACTIVE',
        registeredAt: new Date(),
        age: null,
        ageUnit: 'years',
        dateOfBirth: null,
        bloodGroup: null,
        maritalStatus: null,
        alternateMobile: null,
        email: null,
        address: null,
        city: null,
        district: null,
        state: null,
        pincode: null,
        aadhaarNumber: null,
        abhaId: null,
        guardianName: null,
        guardianRelation: null,
        guardianMobile: null,
        insuranceProvider: null,
        insurancePolicyNo: null,
        insuranceValidTill: null,
        allergies: null,
        chronicDiseases: null,
        registeredBy: userId,
      });

      // Act
      const result = await service.register(
        tenantId,
        userId,
        validDto,
      );

      // Assert
      expect(result.uhid).toBe('PT-2025-000001');
      expect(
        mockPatientsRepository.findByMobile,
      ).toHaveBeenCalledWith(tenantId, validDto.mobile);
      expect(
        mockPatientsRepository.generateUhid,
      ).toHaveBeenCalledWith(tenantId);
      expect(mockPatientsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if mobile exists', async () => {
      // Arrange
      mockPatientsRepository.findByMobile.mockResolvedValue({
        id: 'existing-id',
        uhid: 'PT-2025-000001',
      });

      // Act & Assert
      await expect(
        service.register(tenantId, userId, validDto),
      ).rejects.toThrow(ConflictException);

      expect(
        mockPatientsRepository.generateUhid,
      ).not.toHaveBeenCalled();
      expect(mockPatientsRepository.create).not.toHaveBeenCalled();
    });

    it('should auto-calculate age from dateOfBirth', async () => {
      // Arrange
      mockPatientsRepository.findByMobile.mockResolvedValue(null);
      mockPatientsRepository.generateUhid.mockResolvedValue(
        'PT-2025-000002',
      );
      mockPatientsRepository.create.mockResolvedValue({
        id: 'p2',
        uhid: 'PT-2025-000002',
        tenantId,
        age: 35,
        ageUnit: 'years',
        status: 'ACTIVE',
        patientType: 'NEW',
        registeredAt: new Date(),
        ...validDto,
      });

      const dtoWithDob = {
        ...validDto,
        dateOfBirth: '1990-01-01',
      };

      // Act
      await service.register(tenantId, userId, dtoWithDob);

      // Assert: create called with calculated age
      expect(mockPatientsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          age: expect.any(Number),
          ageUnit: 'years',
        }),
      );
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