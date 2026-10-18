import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BedStatusService } from '../services/bed-status.service';
import { BedStatusRepository } from '../repositories/bed-status.repository';
import { BedsRepository } from '../repositories/beds.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockBedStatusRepo = {
  getCurrentStatus: jest.fn(),
  transition: jest.fn(),
  getHistory: jest.fn(),
  findByPatient: jest.fn(),
};

const mockBedsRepo = {
  findById: jest.fn(),
};

const mockPrisma = {
  patient: { findFirst: jest.fn() },
};

describe('BedStatusService (state machine)', () => {
  let service: BedStatusService;

  const tenantId = 'tenant-uuid';
  const bedId = 'bed-uuid';
  const patientId = 'patient-uuid';
  const changedBy = 'user-uuid';

  const bed = { id: bedId, bedIdentifier: 'GW-1/01', tenantId };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedStatusService,
        { provide: BedStatusRepository, useValue: mockBedStatusRepo },
        { provide: BedsRepository, useValue: mockBedsRepo },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BedStatusService>(BedStatusService);
    jest.clearAllMocks();

    mockBedsRepo.findById.mockResolvedValue(bed);
    mockPrisma.patient.findFirst.mockResolvedValue({ id: patientId });
    mockBedStatusRepo.transition.mockImplementation((_t, _b, data) =>
      Promise.resolve({ ...data, effectiveFrom: new Date() }),
    );
  });

  const setupCurrent = (status: string, patientId: string | null = null) => {
    mockBedStatusRepo.getCurrentStatus.mockResolvedValue({
      status,
      patientId,
    });
  };

  // ─── Valid transitions ────────────────────────────────────────────────
  it.each([
    ['AVAILABLE', 'RESERVED'],
    ['AVAILABLE', 'OCCUPIED'],
    ['AVAILABLE', 'MAINTENANCE'],
    ['RESERVED', 'OCCUPIED'],
    ['RESERVED', 'AVAILABLE'],
    ['OCCUPIED', 'DISCHARGE_PENDING'],
    ['DISCHARGE_PENDING', 'HOUSEKEEPING'],
    ['DISCHARGE_PENDING', 'OCCUPIED'],
    ['HOUSEKEEPING', 'AVAILABLE'],
    ['MAINTENANCE', 'AVAILABLE'],
    ['OUT_OF_SERVICE', 'AVAILABLE'],
    ['OUT_OF_SERVICE', 'MAINTENANCE'],
  ])('allows %s → %s', async (from, to) => {
    setupCurrent(from, from === 'OCCUPIED' ? patientId : null);

    const result = await service.changeStatus(
      tenantId,
      bedId,
      { status: to as any, patientId },
      changedBy,
    );

    expect(result.previousStatus).toBe(from);
    expect(result.currentStatus).toBe(to);
    expect(mockBedStatusRepo.transition).toHaveBeenCalledTimes(1);
  });

  // ─── Invalid transitions ──────────────────────────────────────────────
  it.each([
    ['OCCUPIED', 'AVAILABLE'], // must go through DISCHARGE_PENDING → HOUSEKEEPING
    ['OCCUPIED', 'HOUSEKEEPING'],
    ['RESERVED', 'HOUSEKEEPING'],
    ['HOUSEKEEPING', 'OCCUPIED'],
    ['MAINTENANCE', 'OCCUPIED'],
    ['OUT_OF_SERVICE', 'RESERVED'],
    ['DISCHARGE_PENDING', 'RESERVED'],
  ])('rejects %s → %s with INVALID_STATUS_TRANSITION', async (from, to) => {
    setupCurrent(from, from === 'OCCUPIED' ? patientId : null);

    await expect(
      service.changeStatus(tenantId, bedId, { status: to as any }, changedBy),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_STATUS_TRANSITION',
      }),
    });
    await expect(
      service.changeStatus(tenantId, bedId, { status: to as any }, changedBy),
    ).rejects.toThrow(BadRequestException);

    expect(mockBedStatusRepo.transition).not.toHaveBeenCalled();
  });

  // ─── Patient requirement ──────────────────────────────────────────────
  it('requires patientId when becoming OCCUPIED', async () => {
    setupCurrent('AVAILABLE');

    await expect(
      service.changeStatus(tenantId, bedId, { status: 'OCCUPIED' }, changedBy),
    ).rejects.toThrow(BadRequestException);

    expect(mockBedStatusRepo.transition).not.toHaveBeenCalled();
  });

  it('rejects a patient from another tenant', async () => {
    setupCurrent('AVAILABLE');
    mockPrisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.changeStatus(
        tenantId,
        bedId,
        { status: 'OCCUPIED', patientId },
        changedBy,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('clears patientId when the bed frees up (HOUSEKEEPING)', async () => {
    setupCurrent('DISCHARGE_PENDING', patientId);

    await service.changeStatus(
      tenantId,
      bedId,
      { status: 'HOUSEKEEPING', reason: 'Deep cleaning' },
      changedBy,
    );

    expect(mockBedStatusRepo.transition).toHaveBeenCalledWith(
      tenantId,
      bedId,
      expect.objectContaining({
        status: 'HOUSEKEEPING',
        patientId: null,
        reason: 'Deep cleaning',
        changedBy,
      }),
    );
  });

  it('records reservedBy when reserving', async () => {
    setupCurrent('AVAILABLE');

    await service.changeStatus(
      tenantId,
      bedId,
      { status: 'RESERVED', patientId },
      changedBy,
    );

    expect(mockBedStatusRepo.transition).toHaveBeenCalledWith(
      tenantId,
      bedId,
      expect.objectContaining({
        status: 'RESERVED',
        patientId,
        reservedBy: changedBy,
      }),
    );
  });

  it('throws NotFoundException for unknown bed', async () => {
    mockBedsRepo.findById.mockResolvedValue(null);

    await expect(
      service.changeStatus(
        tenantId,
        bedId,
        { status: 'RESERVED', patientId },
        changedBy,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
