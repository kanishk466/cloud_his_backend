import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PackageConsumptionEngineService } from '../services/package-consumption-engine.service';
import { PackageConsumptionRepository } from '../repositories/package-consumption.repository';

const mockRepo = {
  getConsumedQuantity: jest.fn(),
  getConsumedVisits: jest.fn(),
  findComponent: jest.fn(),
  findConsultAllowance: jest.fn(),
  findPackage: jest.fn(),
  findPatient: jest.fn(),
  findDoctor: jest.fn(),
  findService: jest.fn(),
  record: jest.fn(),
  findUsage: jest.fn(),
};

describe('PackageConsumptionEngineService', () => {
  let service: PackageConsumptionEngineService;

  const tenantId = 'tenant-uuid';
  const patientId = 'patient-uuid';
  const packageId = 'pkg-lap-chol';
  const cbcServiceId = 'svc-cbc';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageConsumptionEngineService,
        { provide: PackageConsumptionRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PackageConsumptionEngineService>(
      PackageConsumptionEngineService,
    );
    jest.clearAllMocks();

    mockRepo.findPackage.mockResolvedValue({
      id: packageId,
      name: 'Lap Chole',
      code: 'PKG-LAP-CHOL',
    });
    mockRepo.findPatient.mockResolvedValue({ id: patientId });
    mockRepo.findComponent.mockResolvedValue({
      serviceId: cbcServiceId,
      quantity: 2, // package includes 2 CBCs
      service: { id: cbcServiceId, serviceName: 'CBC', baseRate: 250 },
    });
  });

  // ─── THE CORE SCENARIO: 2 covered, 3rd extra-billed ────────────────────
  describe('service quota evaluation (2× CBC included)', () => {
    it('1st CBC → covered at ₹0, quota left = 1', async () => {
      mockRepo.getConsumedQuantity.mockResolvedValue(0);

      const result = await service.evaluateConsumption(
        tenantId,
        patientId,
        packageId,
        { serviceId: cbcServiceId },
      );

      expect(result).toMatchObject({
        isCovered: true,
        remainingQuota: 1,
        chargeAmount: 0,
        allowedQuantity: 2,
      });
    });

    it('2nd CBC → covered at ₹0, quota left = 0', async () => {
      mockRepo.getConsumedQuantity.mockResolvedValue(1);

      const result = await service.evaluateConsumption(
        tenantId,
        patientId,
        packageId,
        { serviceId: cbcServiceId },
      );

      expect(result).toMatchObject({
        isCovered: true,
        remainingQuota: 0,
        chargeAmount: 0,
      });
    });

    it('3rd CBC → PACKAGE_QUOTA_EXHAUSTED, charged at standard rate ₹250', async () => {
      mockRepo.getConsumedQuantity.mockResolvedValue(2);

      const result = await service.evaluateConsumption(
        tenantId,
        patientId,
        packageId,
        { serviceId: cbcServiceId },
      );

      expect(result).toMatchObject({
        isCovered: false,
        remainingQuota: 0,
        chargeAmount: 250,
        reason: 'PACKAGE_QUOTA_EXHAUSTED',
      });
    });
  });

  // ─── NOT_IN_PACKAGE ────────────────────────────────────────────────────
  it('service outside the package → charged at base rate', async () => {
    mockRepo.findComponent.mockResolvedValue(null);
    mockRepo.findService.mockResolvedValue({
      id: 'svc-mri',
      serviceName: 'MRI Brain',
      baseRate: 5000,
    });

    const result = await service.evaluateConsumption(
      tenantId,
      patientId,
      packageId,
      { serviceId: 'svc-mri' },
    );

    expect(result).toMatchObject({
      isCovered: false,
      chargeAmount: 5000,
      reason: 'NOT_IN_PACKAGE',
    });
  });

  // ─── DOCTOR CONSULT QUOTA ──────────────────────────────────────────────
  describe('doctor consult evaluation', () => {
    const doctorId = 'doc-surgeon';

    beforeEach(() => {
      mockRepo.findDoctor.mockResolvedValue({
        id: doctorId,
        consultationFee: 1500,
        clinicalDepartmentId: 'dept-surgery',
      });
      mockRepo.findConsultAllowance.mockResolvedValue({
        maxVisits: 3, // 3 daily surgeon rounds included
      });
    });

    it('round 3 → covered; round 4 → exhausted at doctor fee', async () => {
      mockRepo.getConsumedVisits.mockResolvedValue(2);

      const covered = await service.evaluateConsumption(
        tenantId,
        patientId,
        packageId,
        { doctorProfileId: doctorId },
      );
      expect(covered).toMatchObject({
        isCovered: true,
        remainingQuota: 0,
        chargeAmount: 0,
      });

      mockRepo.getConsumedVisits.mockResolvedValue(3);
      const exhausted = await service.evaluateConsumption(
        tenantId,
        patientId,
        packageId,
        { doctorProfileId: doctorId },
      );
      expect(exhausted).toMatchObject({
        isCovered: false,
        chargeAmount: 1500,
        reason: 'PACKAGE_QUOTA_EXHAUSTED',
      });
    });

    it('doctor without allowance → NOT_IN_PACKAGE at doctor fee', async () => {
      mockRepo.findConsultAllowance.mockResolvedValue(null);

      const result = await service.evaluateConsumption(
        tenantId,
        patientId,
        packageId,
        { doctorProfileId: doctorId },
      );

      expect(result).toMatchObject({
        isCovered: false,
        chargeAmount: 1500,
        reason: 'NOT_IN_PACKAGE',
      });
    });
  });

  // ─── RECORD ────────────────────────────────────────────────────────────
  it('recordConsumption writes the ledger row', async () => {
    mockRepo.record.mockResolvedValue({ id: 'cons-1' });

    await service.recordConsumption(tenantId, {
      packageId,
      patientId,
      serviceId: cbcServiceId,
      consumedQuantity: 1,
      isExtraBilled: false,
      billId: 'bill-1',
    });

    expect(mockRepo.record).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ serviceId: cbcServiceId, billId: 'bill-1' }),
    );
  });

  it('rejects unknown package/patient (404)', async () => {
    mockRepo.findPackage.mockResolvedValue(null);
    await expect(
      service.evaluateConsumption(tenantId, patientId, 'x', {
        serviceId: cbcServiceId,
      }),
    ).rejects.toThrow(NotFoundException);

    mockRepo.findPackage.mockResolvedValue({ id: packageId });
    mockRepo.findPatient.mockResolvedValue(null);
    await expect(
      service.recordConsumption(tenantId, {
        packageId,
        patientId,
        serviceId: cbcServiceId,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
