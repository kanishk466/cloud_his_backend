import { Test, TestingModule } from '@nestjs/testing';
import { DoctorShareReportService } from '../services/doctor-share-report.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockPrisma = {
  opdBill: { findMany: jest.fn() },
};

describe('DoctorShareReportService', () => {
  let service: DoctorShareReportService;

  const tenantId = 'tenant-uuid';

  const makeBill = (
    doctorId: string,
    fee: number,
    sharePercent: number,
    deptName = 'Cardiology',
  ) => ({
    id: `bill-${doctorId}-${fee}`,
    appointment: {
      consultationFee: fee,
      doctorProfile: {
        id: doctorId,
        doctorSharePercent: sharePercent,
        hospitalUser: { firstName: 'Sharma', lastName: 'A' },
        clinicalDepartment: { id: `dept-${deptName}`, name: deptName },
        specializationRel: { name: 'Interventional Cardiology' },
      },
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorShareReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DoctorShareReportService>(DoctorShareReportService);
    jest.clearAllMocks();
  });

  it('groups revenue per doctor with correct share math', async () => {
    mockPrisma.opdBill.findMany.mockResolvedValue([
      makeBill('doc-1', 500, 70),
      makeBill('doc-1', 500, 70),
      makeBill('doc-2', 300, 50),
    ]);

    const result = await service.generateShareReport(tenantId, {
      dateFrom: new Date('2026-10-01'),
      dateTo: new Date('2026-10-31'),
    });

    const doc1 = result.doctors.find((d) => d.doctorId === 'doc-1');
    expect(doc1).toMatchObject({
      totalAppointments: 2,
      grossRevenue: 1000,
      sharePercent: 70,
      shareAmount: 700,
      hospitalRetained: 300,
    });

    const doc2 = result.doctors.find((d) => d.doctorId === 'doc-2');
    expect(doc2).toMatchObject({
      grossRevenue: 300,
      shareAmount: 150,
      hospitalRetained: 150,
    });
  });

  it('computes hospital-wide and department totals', async () => {
    mockPrisma.opdBill.findMany.mockResolvedValue([
      makeBill('doc-1', 1000, 70),
      makeBill('doc-2', 400, 25, 'Orthopaedics'),
    ]);

    const result = await service.generateShareReport(tenantId, {});

    expect(result.hospitalTotals).toEqual({
      grossRevenue: 1400,
      shareAmount: 800, // 700 + 100
      hospitalRetained: 600,
      totalAppointments: 2,
    });
    expect(result.departmentTotals).toHaveLength(2);
  });

  it('applies doctor/department/date filters to the query', async () => {
    mockPrisma.opdBill.findMany.mockResolvedValue([]);

    await service.generateShareReport(tenantId, {
      doctorProfileId: 'doc-1',
      departmentId: 'dept-1',
      dateFrom: new Date('2026-10-01'),
      dateTo: new Date('2026-10-31'),
    });

    expect(mockPrisma.opdBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          paymentStatus: 'PAID',
          appointmentId: { not: null },
          appointment: expect.objectContaining({
            doctorProfileId: 'doc-1',
            doctorProfile: { clinicalDepartmentId: 'dept-1' },
          }),
        }),
      }),
    );
  });

  it('returns zeros for an empty period', async () => {
    mockPrisma.opdBill.findMany.mockResolvedValue([]);

    const result = await service.generateShareReport(tenantId, {});

    expect(result.doctors).toEqual([]);
    expect(result.hospitalTotals.grossRevenue).toBe(0);
  });
});
