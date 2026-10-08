import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReferralCommissionsService } from '../services/referral-commissions.service';
import { ReferralCommissionsRepository } from '../repositories/referral-commissions.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockRepo = {
  create: jest.fn(),
  findByBillId: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  settle: jest.fn(),
  bulkSettle: jest.fn(),
  getSummary: jest.fn(),
};

const mockPrisma = {
  appointment: { findFirst: jest.fn() },
  referDoctor: { findFirst: jest.fn() },
};

describe('ReferralCommissionsService', () => {
  let service: ReferralCommissionsService;

  const tenantId = 'tenant-uuid';
  const billId = 'bill-uuid';
  const appointmentId = 'appointment-uuid';
  const referDoctorId = 'ref-doctor-uuid';
  const proUserId = 'pro-user-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralCommissionsService,
        { provide: ReferralCommissionsRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReferralCommissionsService>(
      ReferralCommissionsService,
    );
    jest.clearAllMocks();
  });

  // ─── createForBill (billing hook) ─────────────────────────────────────
  describe('createForBill', () => {
    const input = {
      tenantId,
      billId,
      appointmentId,
      patientId: 'patient-uuid',
      billAmount: 2000,
    };

    it('creates a PENDING commission with rate + PRO snapshots', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ referDoctorId });
      mockPrisma.referDoctor.findFirst.mockResolvedValue({
        id: referDoctorId,
        commissionPercent: 10,
        proUserId,
      });
      mockRepo.findByBillId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'comm-1' });

      await service.createForBill(input);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          referDoctorId,
          appointmentId,
          billId,
          billAmount: 2000,
          commissionRate: 10,
          commissionAmount: 200, // 10% of 2000
          proUserId,
          status: 'PENDING',
        }),
      );
    });

    it('does nothing when appointment has no referDoctorId', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        referDoctorId: null,
      });

      await service.createForBill(input);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('does nothing when there is no appointmentId', async () => {
      await service.createForBill({ ...input, appointmentId: null });

      expect(mockPrisma.appointment.findFirst).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('is idempotent — skips when a commission already exists for the bill', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ referDoctorId });
      mockPrisma.referDoctor.findFirst.mockResolvedValue({
        id: referDoctorId,
        commissionPercent: 10,
        proUserId,
      });
      mockRepo.findByBillId.mockResolvedValue({ id: 'existing' });

      await service.createForBill(input);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('skips when commission rate is 0%', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ referDoctorId });
      mockPrisma.referDoctor.findFirst.mockResolvedValue({
        id: referDoctorId,
        commissionPercent: 0,
        proUserId,
      });
      mockRepo.findByBillId.mockResolvedValue(null);

      await service.createForBill(input);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('never throws — logs and swallows internal errors', async () => {
      mockPrisma.appointment.findFirst.mockRejectedValue(new Error('DB down'));

      await expect(service.createForBill(input)).resolves.toBeUndefined();
    });
  });

  // ─── settle ────────────────────────────────────────────────────────────
  describe('settle', () => {
    const commission = { id: 'comm-1', status: 'PENDING' };

    it('marks a commission as PAID with settledBy', async () => {
      mockRepo.findById.mockResolvedValue(commission);
      mockRepo.settle.mockResolvedValue({ ...commission, status: 'PAID' });

      const result = await service.settle(
        tenantId,
        'comm-1',
        { status: 'PAID', notes: 'UPI transfer' },
        'admin-uuid',
      );

      expect(mockRepo.settle).toHaveBeenCalledWith(
        tenantId,
        'comm-1',
        'PAID',
        'admin-uuid',
        'UPI transfer',
      );
      expect(result.status).toBe('PAID');
    });

    it('throws NotFoundException for unknown commission', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.settle(tenantId, 'comm-x', { status: 'PAID' }, 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks changing an already-PAID commission', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'comm-1', status: 'PAID' });

      await expect(
        service.settle(
          tenantId,
          'comm-1',
          { status: 'CANCELLED' },
          'admin-uuid',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── bulkSettle ────────────────────────────────────────────────────────
  describe('bulkSettle', () => {
    it('settles multiple commissions at once', async () => {
      mockRepo.bulkSettle.mockResolvedValue({ count: 3 });

      const result = await service.bulkSettle(
        tenantId,
        { commissionIds: ['a', 'b', 'c'], status: 'PAID' },
        'admin-uuid',
      );

      expect(result).toEqual({
        message: '3 commission(s) marked as PAID',
        updated: 3,
      });
    });
  });

  // ─── summary ───────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('aggregates per doctor and per PRO', async () => {
      mockRepo.getSummary.mockResolvedValue({
        commissions: [
          {
            referDoctorId: 'd1',
            billAmount: 1000,
            commissionAmount: 100,
            status: 'PAID',
            proUserId: 'pro1',
            referDoctor: {
              id: 'd1',
              name: 'Dr. Shah',
              code: 'REF-1',
              proUserId: 'pro1',
            },
          },
          {
            referDoctorId: 'd1',
            billAmount: 2000,
            commissionAmount: 200,
            status: 'PENDING',
            proUserId: 'pro1',
            referDoctor: {
              id: 'd1',
              name: 'Dr. Shah',
              code: 'REF-1',
              proUserId: 'pro1',
            },
          },
          {
            referDoctorId: 'd2',
            billAmount: 500,
            commissionAmount: 50,
            status: 'PENDING',
            proUserId: 'pro1',
            referDoctor: {
              id: 'd2',
              name: 'Dr. Mehta',
              code: 'REF-2',
              proUserId: 'pro1',
            },
          },
        ],
        referDoctors: [{ id: 'pro1', firstName: 'Ravi', lastName: 'Verma' }],
      });

      const result = await service.getSummary(tenantId, {});

      const shah = result.byDoctor.find((d) => d.referDoctorId === 'd1');
      expect(shah).toMatchObject({
        doctorName: 'Dr. Shah',
        totalBills: 2,
        totalBillAmount: 3000,
        totalCommission: 300,
        pendingCommission: 200,
        paidCommission: 100,
      });

      expect(result.byPro).toEqual([
        {
          proUserId: 'pro1',
          proName: 'Ravi Verma',
          totalDoctorsManaged: 2,
          totalCommission: 350,
        },
      ]);
    });
  });
});
