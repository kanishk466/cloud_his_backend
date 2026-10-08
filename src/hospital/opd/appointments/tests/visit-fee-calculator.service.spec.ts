import { Test, TestingModule } from '@nestjs/testing';
import { VisitFeeCalculatorService } from '../services/visit-fee-calculator.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockPrisma = {
  doctorProfile: { findFirst: jest.fn() },
  doctorOpdVisitConfig: { findMany: jest.fn() },
  patient: { findFirst: jest.fn() },
  appointment: { findFirst: jest.fn(), count: jest.fn() },
};

describe('VisitFeeCalculatorService', () => {
  let service: VisitFeeCalculatorService;

  const tenantId = 'tenant-uuid';
  const doctorProfileId = 'doctor-uuid';
  const patientId = 'patient-uuid';
  const panelId = 'panel-uuid';

  const generalConfig = {
    id: 'cfg-general',
    panelId: null,
    firstVisitFee: 500,
    followUpDays: 7,
    followUpMaxVisits: 1,
    followUpFee: 0,
    emergencyFee: 800,
    isActive: true,
  };

  const panelConfig = {
    ...generalConfig,
    id: 'cfg-panel',
    panelId,
    firstVisitFee: 400,
    followUpFee: 100,
    emergencyFee: null,
  };

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitFeeCalculatorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VisitFeeCalculatorService>(VisitFeeCalculatorService);
    jest.clearAllMocks();

    mockPrisma.doctorProfile.findFirst.mockResolvedValue({
      id: doctorProfileId,
      consultationFee: 600,
    });
    mockPrisma.patient.findFirst.mockResolvedValue({ panelId: null });
    mockPrisma.doctorOpdVisitConfig.findMany.mockResolvedValue([generalConfig]);
    mockPrisma.appointment.findFirst.mockResolvedValue(null); // no anchor
    mockPrisma.appointment.count.mockResolvedValue(0);
  });

  it('charges firstVisitFee for a first-time patient', async () => {
    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
    );

    expect(result).toMatchObject({
      fee: 500,
      isFollowUp: false,
      configUsed: 'GENERAL_CONFIG',
    });
  });

  it('falls back to DoctorProfile.consultationFee when no config exists', async () => {
    mockPrisma.doctorOpdVisitConfig.findMany.mockResolvedValue([]);

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
    );

    expect(result).toMatchObject({
      fee: 600,
      isFollowUp: false,
      configUsed: 'DOCTOR_PROFILE',
    });
  });

  it('charges followUpFee inside the window with quota left', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      appointmentDate: daysAgo(3), // anchor (non-follow-up) 3 days ago
    });
    mockPrisma.appointment.count.mockResolvedValue(0); // no follow-ups consumed

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
    );

    expect(result).toMatchObject({ fee: 0, isFollowUp: true });
  });

  it('charges firstVisitFee on the 8th day (window expired)', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      appointmentDate: daysAgo(8),
    });

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
    );

    expect(result).toMatchObject({ fee: 500, isFollowUp: false });
  });

  it('charges firstVisitFee when follow-up quota is consumed', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      appointmentDate: daysAgo(4),
    });
    mockPrisma.appointment.count.mockResolvedValue(1); // max 1 consumed

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
    );

    expect(result).toMatchObject({ fee: 500, isFollowUp: false });
  });

  it('prefers panel config and its fees', async () => {
    mockPrisma.doctorOpdVisitConfig.findMany.mockResolvedValue([
      generalConfig,
      panelConfig,
    ]);
    mockPrisma.patient.findFirst.mockResolvedValue({ panelId });
    mockPrisma.appointment.findFirst.mockResolvedValue({
      appointmentDate: daysAgo(2),
    });

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
    );

    expect(result).toMatchObject({
      fee: 100, // panel followUpFee
      isFollowUp: true,
      configUsed: 'PANEL_CONFIG',
    });
  });

  it('charges emergencyFee for EMERGENCY type when configured', async () => {
    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
      undefined,
      'EMERGENCY',
    );

    expect(result).toMatchObject({ fee: 800, isFollowUp: false });
  });

  it('emergency fee wins over follow-up fee', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      appointmentDate: daysAgo(1),
    });

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
      undefined,
      'EMERGENCY',
    );

    expect(result.fee).toBe(800);
  });

  it('falls back to firstVisitFee for EMERGENCY when no emergencyFee set', async () => {
    mockPrisma.doctorOpdVisitConfig.findMany.mockResolvedValue([
      { ...generalConfig, emergencyFee: null },
    ]);

    const result = await service.calculateFee(
      tenantId,
      doctorProfileId,
      patientId,
      undefined,
      'EMERGENCY',
    );

    expect(result.fee).toBe(500);
  });
});
