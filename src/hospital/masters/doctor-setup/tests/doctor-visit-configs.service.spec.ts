import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DoctorVisitConfigsService } from '../services/doctor-visit-configs.service';
import { DoctorVisitConfigsRepository } from '../repositories/doctor-visit-configs.repository';

const mockRepository = {
  findByDoctorAndPanel: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  findForDoctor: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findDoctorProfile: jest.fn(),
  findPanel: jest.fn(),
};

describe('DoctorVisitConfigsService', () => {
  let service: DoctorVisitConfigsService;

  const tenantId = 'tenant-uuid';
  const doctorProfileId = 'doctor-uuid';
  const panelId = 'panel-uuid';

  const doctor = {
    id: doctorProfileId,
    consultationFee: 500,
    isActive: true,
  };

  const generalConfig = {
    id: 'cfg-general',
    tenantId,
    doctorProfileId,
    panelId: null,
    firstVisitFee: 500,
    followUpDays: 7,
    followUpMaxVisits: 1,
    followUpFee: 0,
    emergencyFee: null,
    isActive: true,
  };

  const panelConfig = {
    ...generalConfig,
    id: 'cfg-panel',
    panelId,
    firstVisitFee: 400,
    followUpFee: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorVisitConfigsService,
        { provide: DoctorVisitConfigsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<DoctorVisitConfigsService>(DoctorVisitConfigsService);
    jest.clearAllMocks();
  });

  // ─── UPSERT ────────────────────────────────────────────────────────────
  describe('upsert', () => {
    const dto = {
      doctorProfileId,
      firstVisitFee: 500,
      followUpDays: 7,
      followUpMaxVisits: 1,
      followUpFee: 0,
    };

    it('creates when no config exists for the doctor', async () => {
      mockRepository.findDoctorProfile.mockResolvedValue(doctor);
      mockRepository.findByDoctorAndPanel.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(generalConfig);

      const result = await service.upsert(tenantId, dto);

      expect(result.action).toBe('created');
      expect(mockRepository.create).toHaveBeenCalledWith(tenantId, dto);
    });

    it('updates the existing general config (NULL panelId guard)', async () => {
      mockRepository.findDoctorProfile.mockResolvedValue(doctor);
      mockRepository.findByDoctorAndPanel.mockResolvedValue(generalConfig);
      mockRepository.update.mockResolvedValue({
        ...generalConfig,
        firstVisitFee: 600,
      });

      const result = await service.upsert(tenantId, {
        ...dto,
        firstVisitFee: 600,
      });

      expect(result.action).toBe('updated');
      expect(mockRepository.update).toHaveBeenCalledWith(
        tenantId,
        'cfg-general',
        expect.not.objectContaining({ doctorProfileId }),
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('rejects unknown doctor profile (404)', async () => {
      mockRepository.findDoctorProfile.mockResolvedValue(null);

      await expect(service.upsert(tenantId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a panel from another tenant (404)', async () => {
      mockRepository.findDoctorProfile.mockResolvedValue(doctor);
      mockRepository.findPanel.mockResolvedValue(null);

      await expect(
        service.upsert(tenantId, { ...dto, panelId }),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─── FIND FOR DOCTOR ───────────────────────────────────────────────────
  describe('findForDoctor', () => {
    it('splits general vs panel configs', async () => {
      mockRepository.findDoctorProfile.mockResolvedValue(doctor);
      mockRepository.findForDoctor.mockResolvedValue([
        generalConfig,
        panelConfig,
      ]);

      const result = await service.findForDoctor(tenantId, doctorProfileId);

      expect(result.general?.id).toBe('cfg-general');
      expect(result.panelConfigs).toHaveLength(1);
      expect(result.panelConfigs[0].panelId).toBe(panelId);
    });
  });

  // ─── CALCULATE VISIT FEE ───────────────────────────────────────────────
  describe('calculateVisitFee', () => {
    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    beforeEach(() => {
      mockRepository.findDoctorProfile.mockResolvedValue(doctor);
    });

    it('returns firstVisitFee when there is no last visit', async () => {
      mockRepository.findByDoctorAndPanel.mockResolvedValue(generalConfig);

      const result = await service.calculateVisitFee(tenantId, {
        doctorProfileId,
      });

      expect(result).toMatchObject({
        isFollowUp: false,
        consultationFee: 500,
        source: 'GENERAL_CONFIG',
      });
    });

    it('returns followUpFee inside the window with quota left', async () => {
      mockRepository.findByDoctorAndPanel.mockResolvedValue(generalConfig);

      const result = await service.calculateVisitFee(tenantId, {
        doctorProfileId,
        lastVisitDate: daysAgo(5), // within 7-day window
        visitCount: 0, // 0 of max 1 consumed
      });

      expect(result).toMatchObject({ isFollowUp: true, consultationFee: 0 });
    });

    it('returns firstVisitFee outside the window (8th day)', async () => {
      mockRepository.findByDoctorAndPanel.mockResolvedValue(generalConfig);

      const result = await service.calculateVisitFee(tenantId, {
        doctorProfileId,
        lastVisitDate: daysAgo(8), // beyond 7-day window
        visitCount: 0,
      });

      expect(result).toMatchObject({ isFollowUp: false, consultationFee: 500 });
    });

    it('returns firstVisitFee when follow-up quota is exhausted', async () => {
      mockRepository.findByDoctorAndPanel.mockResolvedValue(generalConfig);

      const result = await service.calculateVisitFee(tenantId, {
        doctorProfileId,
        lastVisitDate: daysAgo(2),
        visitCount: 1, // max 1 already consumed
      });

      expect(result).toMatchObject({ isFollowUp: false, consultationFee: 500 });
    });

    it('prefers panel-specific config over general', async () => {
      mockRepository.findByDoctorAndPanel.mockImplementation(
        (_t: string, _d: string, p?: string) =>
          Promise.resolve(p === panelId ? panelConfig : generalConfig),
      );

      const result = await service.calculateVisitFee(tenantId, {
        doctorProfileId,
        panelId,
        lastVisitDate: daysAgo(3),
        visitCount: 0,
      });

      expect(result).toMatchObject({
        isFollowUp: true,
        consultationFee: 100, // panel's followUpFee, not general's 0
        source: 'PANEL_CONFIG',
      });
    });

    it('falls back to DoctorProfile.consultationFee when no config exists', async () => {
      mockRepository.findByDoctorAndPanel.mockResolvedValue(null);

      const result = await service.calculateVisitFee(tenantId, {
        doctorProfileId,
        lastVisitDate: daysAgo(1),
        visitCount: 0,
      });

      expect(result).toMatchObject({
        isFollowUp: false,
        consultationFee: 500,
        source: 'DOCTOR_PROFILE',
      });
    });
  });
});
