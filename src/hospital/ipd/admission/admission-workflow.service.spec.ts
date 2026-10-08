import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdmissionWorkflowService } from './admission-workflow.service';
import { AdmissionRepository } from './admission.repository';
import { BedStatusService } from '../../masters/ward-room/services/bed-status.service';
import { ThresholdCheckService } from '../../masters/threshold/threshold-check.service';

const mockRepo = {
  generateAdmissionNo: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  findActive: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  findPatient: jest.fn(),
  findDoctorProfile: jest.fn(),
  findPanel: jest.fn(),
  findReferDoctor: jest.fn(),
  findBedWithStatus: jest.fn(),
};

const mockBedStatusService = {
  changeStatus: jest.fn(),
};

const mockThresholdCheck = {
  checkThreshold: jest.fn(),
};

describe('AdmissionWorkflowService', () => {
  let service: AdmissionWorkflowService;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';
  const admissionId = 'admission-uuid';
  const bedId = 'bed-uuid';
  const newBedId = 'new-bed-uuid';

  const malePatient = {
    id: 'patient-uuid',
    gender: 'MALE',
    dateOfBirth: null,
    ageAtRegistration: 40,
    ageUnit: 'years',
  };

  const makeAdmission = (overrides: any = {}) => ({
    id: admissionId,
    admissionNo: 'IPD-2026-00001',
    patientId: malePatient.id,
    doctorProfileId: 'doctor-uuid',
    bedId: null,
    panelId: null,
    status: 'ADMITTED',
    isActive: true,
    reasonForAdmission: 'Fever',
    patient: malePatient,
    ...overrides,
  });

  const makeBed = (
    id: string,
    status: string,
    gender = 'ANY',
    identifier = 'GW-1/01',
  ) => ({
    id,
    bedIdentifier: identifier,
    room: { roomNumber: identifier.split('/')[0], gender },
    statusHistory: [{ status }],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionWorkflowService,
        { provide: AdmissionRepository, useValue: mockRepo },
        { provide: BedStatusService, useValue: mockBedStatusService },
        { provide: ThresholdCheckService, useValue: mockThresholdCheck },
      ],
    }).compile();

    service = module.get<AdmissionWorkflowService>(AdmissionWorkflowService);
    jest.clearAllMocks();
  });

  // ─── ADMIT ────────────────────────────────────────────────────────────
  describe('admitPatient', () => {
    const dto = { patientId: malePatient.id, doctorProfileId: 'doctor-uuid' };

    beforeEach(() => {
      mockRepo.findPatient.mockResolvedValue(malePatient);
      mockRepo.findDoctorProfile.mockResolvedValue({ id: 'doctor-uuid' });
      mockRepo.generateAdmissionNo.mockResolvedValue('IPD-2026-00001');
      mockRepo.create.mockImplementation((_t, no, d) =>
        Promise.resolve(makeAdmission({ admissionNo: no, ...d })),
      );
    });

    it('creates an admission with generated number', async () => {
      const result = await service.admitPatient(tenantId, dto, userId);

      expect(result.admissionNo).toBe('IPD-2026-00001');
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        'IPD-2026-00001',
        dto,
      );
      expect(mockBedStatusService.changeStatus).not.toHaveBeenCalled();
    });

    it('runs threshold check when panelId is provided', async () => {
      mockRepo.findPanel.mockResolvedValue({ id: 'panel-1' });
      mockThresholdCheck.checkThreshold.mockResolvedValue({ status: 'OK' });

      await service.admitPatient(
        tenantId,
        { ...dto, panelId: 'panel-1' },
        userId,
      );

      expect(mockThresholdCheck.checkThreshold).toHaveBeenCalledWith(
        tenantId,
        'panel-1',
        null,
        0,
      );
    });

    it('assigns bed immediately when bedId is in the DTO', async () => {
      const admission = makeAdmission();
      mockRepo.findById.mockResolvedValue(admission);
      mockRepo.findBedWithStatus.mockResolvedValue(makeBed(bedId, 'AVAILABLE'));
      mockRepo.update.mockResolvedValue({ ...admission, bedId });

      await service.admitPatient(tenantId, { ...dto, bedId }, userId);

      expect(mockBedStatusService.changeStatus).toHaveBeenCalledWith(
        tenantId,
        bedId,
        expect.objectContaining({
          status: 'OCCUPIED',
          patientId: malePatient.id,
        }),
        userId,
      );
    });

    it('sets expectedDischargeDate = now + 24h for DAYCARE', async () => {
      const before = Date.now();
      await service.admitPatient(
        tenantId,
        { ...dto, admissionType: 'DAYCARE' },
        userId,
      );

      const passedDto = mockRepo.create.mock.calls[0][2];
      const expected = passedDto.expectedDischargeDate as Date;
      expect(expected.getTime()).toBeGreaterThanOrEqual(
        before + 23.9 * 60 * 60 * 1000,
      );
      expect(expected.getTime()).toBeLessThanOrEqual(
        Date.now() + 24.1 * 60 * 60 * 1000,
      );
    });

    it('rejects unknown patient (404)', async () => {
      mockRepo.findPatient.mockResolvedValue(null);

      await expect(service.admitPatient(tenantId, dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── ASSIGN BED ───────────────────────────────────────────────────────
  describe('assignBed', () => {
    beforeEach(() => {
      mockRepo.update.mockImplementation((_t, _id, data) =>
        Promise.resolve(makeAdmission(data)),
      );
    });

    it('assigns an AVAILABLE bed and marks it OCCUPIED', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission());
      mockRepo.findBedWithStatus.mockResolvedValue(makeBed(bedId, 'AVAILABLE'));

      await service.assignBed(tenantId, admissionId, { bedId }, userId);

      expect(mockBedStatusService.changeStatus).toHaveBeenCalledWith(
        tenantId,
        bedId,
        expect.objectContaining({
          status: 'OCCUPIED',
          ipdAdmissionId: admissionId,
        }),
        userId,
      );
    });

    it('rejects male patient → FEMALE_ONLY ward', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission());
      mockRepo.findBedWithStatus.mockResolvedValue(
        makeBed(bedId, 'AVAILABLE', 'FEMALE_ONLY'),
      );

      await expect(
        service.assignBed(tenantId, admissionId, { bedId }, userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockBedStatusService.changeStatus).not.toHaveBeenCalled();
    });

    it('rejects a non-available bed (OCCUPIED)', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission());
      mockRepo.findBedWithStatus.mockResolvedValue(makeBed(bedId, 'OCCUPIED'));

      await expect(
        service.assignBed(tenantId, admissionId, { bedId }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when a bed is already assigned', async () => {
      mockRepo.findById.mockResolvedValue(
        makeAdmission({ bedId: 'other-bed' }),
      );

      await expect(
        service.assignBed(tenantId, admissionId, { bedId }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── TRANSFER BED ─────────────────────────────────────────────────────
  describe('transferBed', () => {
    it('moves old bed through DISCHARGE_PENDING → HOUSEKEEPING and new bed → OCCUPIED', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId }));
      mockRepo.findBedWithStatus.mockResolvedValue(
        makeBed(newBedId, 'AVAILABLE', 'ANY', 'PVT-301/01'),
      );
      mockRepo.update.mockResolvedValue(makeAdmission({ bedId: newBedId }));
      mockBedStatusService.changeStatus.mockResolvedValue({});

      await service.transferBed(
        tenantId,
        admissionId,
        { newBedId, reason: 'Upgraded to private' },
        userId,
      );

      const calls = mockBedStatusService.changeStatus.mock.calls;
      expect(calls).toHaveLength(3);
      // Old bed: legal path out of OCCUPIED
      expect(calls[0][1]).toBe(bedId);
      expect(calls[0][2].status).toBe('DISCHARGE_PENDING');
      expect(calls[1][1]).toBe(bedId);
      expect(calls[1][2].status).toBe('HOUSEKEEPING');
      // New bed occupied with admission link
      expect(calls[2][1]).toBe(newBedId);
      expect(calls[2][2]).toMatchObject({
        status: 'OCCUPIED',
        patientId: malePatient.id,
        ipdAdmissionId: admissionId,
      });
    });

    it('rejects transfer when no bed assigned', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId: null }));

      await expect(
        service.transferBed(tenantId, admissionId, { newBedId }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transfer to the same bed', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId }));

      await expect(
        service.transferBed(tenantId, admissionId, { newBedId: bedId }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DISCHARGE LIFECYCLE ──────────────────────────────────────────────
  describe('discharge lifecycle', () => {
    it('initiate → DISCHARGE_ORDERED + bed DISCHARGE_PENDING', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId }));
      mockRepo.update.mockResolvedValue(
        makeAdmission({ bedId, status: 'DISCHARGE_ORDERED' }),
      );
      mockBedStatusService.changeStatus.mockResolvedValue({});

      const result = await service.initiateDischarge(
        tenantId,
        admissionId,
        { dischargeType: 'NORMAL', dischargeSummary: 'Recovered' },
        userId,
      );

      expect(result.status).toBe('DISCHARGE_ORDERED');
      expect(mockBedStatusService.changeStatus).toHaveBeenCalledWith(
        tenantId,
        bedId,
        expect.objectContaining({ status: 'DISCHARGE_PENDING' }),
        userId,
      );
    });

    it('complete → DISCHARGED + bed HOUSEKEEPING', async () => {
      mockRepo.findById.mockResolvedValue(
        makeAdmission({ bedId, status: 'DISCHARGE_ORDERED' }),
      );
      mockRepo.update.mockResolvedValue(
        makeAdmission({ bedId, status: 'DISCHARGED', isActive: false }),
      );
      mockBedStatusService.changeStatus.mockResolvedValue({});

      const result = await service.completeDischarge(
        tenantId,
        admissionId,
        userId,
      );

      expect(result.status).toBe('DISCHARGED');
      expect(mockBedStatusService.changeStatus).toHaveBeenCalledWith(
        tenantId,
        bedId,
        expect.objectContaining({ status: 'HOUSEKEEPING' }),
        userId,
      );
    });

    it('blocks complete before initiate', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId }));

      await expect(
        service.completeDischarge(tenantId, admissionId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks initiate on an already-discharged admission', async () => {
      mockRepo.findById.mockResolvedValue(
        makeAdmission({ status: 'DISCHARGED' }),
      );

      await expect(
        service.initiateDischarge(
          tenantId,
          admissionId,
          { dischargeType: 'NORMAL' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── CANCEL ───────────────────────────────────────────────────────────
  describe('cancelAdmission', () => {
    it('cancels a bed-less admission', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId: null }));
      mockRepo.update.mockResolvedValue(
        makeAdmission({ status: 'CANCELLED', isActive: false }),
      );

      const result = await service.cancelAdmission(
        tenantId,
        admissionId,
        'Patient changed mind',
        userId,
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('blocks cancel when a bed is assigned', async () => {
      mockRepo.findById.mockResolvedValue(makeAdmission({ bedId }));

      await expect(
        service.cancelAdmission(tenantId, admissionId, 'reason', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
