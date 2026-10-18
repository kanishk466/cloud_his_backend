import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillLineValidatorService } from '../services/bill-line-validator.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockPrisma = {
  serviceMaster: { findFirst: jest.fn() },
  patient: { findFirst: jest.fn() },
};

describe('BillLineValidatorService', () => {
  let service: BillLineValidatorService;

  const tenantId = 'tenant-uuid';
  const patientId = 'patient-uuid';
  const serviceId = 'service-uuid';

  const femalePatient = {
    id: patientId,
    gender: 'FEMALE',
    dateOfBirth: (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 40); // reliably 40 years old
      return d;
    })(),
    ageAtRegistration: null,
    ageUnit: 'years',
  };

  const baseService = {
    id: serviceId,
    serviceCode: 'LAB-CBC',
    serviceName: 'Complete Blood Count',
    baseRate: 250,
    isActive: true,
    rateEditable: false,
    discountable: true,
    genderRestriction: null,
    minAgeYears: null,
    maxAgeYears: null,
    categoryRel: { id: 'c1', name: 'Diagnostics / Lab', code: 'DIAG' },
    subCategoryRel: {
      id: 's1',
      name: 'Hematology',
      displayName: 'Hematology Lab',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillLineValidatorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillLineValidatorService>(BillLineValidatorService);
    jest.clearAllMocks();
  });

  it('passes a fully valid line and returns service details', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue(baseService);

    const result = await service.validateBillLine(
      tenantId,
      patientId,
      serviceId,
      250,
      10,
      1,
    );

    expect(result.isValid).toBe(true);
    expect(result.serviceDetails).toMatchObject({
      name: 'Complete Blood Count',
      baseRate: 250,
      category: 'Diagnostics / Lab',
      subCategory: 'Hematology Lab',
    });
  });

  it('rejects unknown service (SERVICE_NOT_FOUND)', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue(null);

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 0, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_NOT_FOUND' }),
    });
    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 0, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects inactive service', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      isActive: false,
    });

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 0, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_NOT_FOUND' }),
    });
  });

  it('rejects gender mismatch (SERVICE_GENDER_MISMATCH)', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      serviceName: 'Pap Smear',
      genderRestriction: 'MALE',
    });
    mockPrisma.patient.findFirst.mockResolvedValue(femalePatient);

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 0, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_GENDER_MISMATCH' }),
    });
  });

  it('passes gender match', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      genderRestriction: 'FEMALE',
    });
    mockPrisma.patient.findFirst.mockResolvedValue(femalePatient);

    const result = await service.validateBillLine(
      tenantId,
      patientId,
      serviceId,
      250,
      0,
      1,
    );

    expect(result.isValid).toBe(true);
  });

  it('rejects when patient is older than maxAgeYears (SERVICE_AGE_MISMATCH)', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      serviceName: 'Phototherapy',
      maxAgeYears: 1,
    });
    mockPrisma.patient.findFirst.mockResolvedValue(femalePatient); // 40 yrs

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 0, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_AGE_MISMATCH' }),
    });
  });

  it('rejects when patient is younger than minAgeYears', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      minAgeYears: 60,
    });
    mockPrisma.patient.findFirst.mockResolvedValue(femalePatient); // 40 yrs

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 0, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_AGE_MISMATCH' }),
    });
  });

  it('passes age inside range using ageAtRegistration (months)', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      maxAgeYears: 1,
    });
    mockPrisma.patient.findFirst.mockResolvedValue({
      ...femalePatient,
      dateOfBirth: null,
      ageAtRegistration: 6,
      ageUnit: 'months',
    });

    const result = await service.validateBillLine(
      tenantId,
      patientId,
      serviceId,
      250,
      0,
      1,
    );

    expect(result.isValid).toBe(true);
  });

  it('rejects modified rate when rateEditable=false (RATE_NOT_EDITABLE)', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue(baseService);

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 300, 0, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'RATE_NOT_EDITABLE' }),
    });
  });

  it('allows modified rate when rateEditable=true', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      rateEditable: true,
    });

    const result = await service.validateBillLine(
      tenantId,
      patientId,
      serviceId,
      300,
      0,
      1,
    );

    expect(result.isValid).toBe(true);
  });

  it('rejects discount on non-discountable service (SERVICE_NOT_DISCOUNTABLE)', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      serviceName: 'Blood Bag',
      discountable: false,
    });

    await expect(
      service.validateBillLine(tenantId, patientId, serviceId, 250, 5, 1),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_NOT_DISCOUNTABLE' }),
    });
  });

  it('allows zero discount on non-discountable service', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      ...baseService,
      discountable: false,
    });

    const result = await service.validateBillLine(
      tenantId,
      patientId,
      serviceId,
      250,
      0,
      1,
    );

    expect(result.isValid).toBe(true);
  });
});
