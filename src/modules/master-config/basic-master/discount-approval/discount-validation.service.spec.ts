import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DiscountValidationService } from './discount-validation.service';

describe('DiscountValidationService', () => {
  let service: DiscountValidationService;
  let prisma: {
    discountReason: { findFirst: jest.Mock };
    discountApproval: { findFirst: jest.Mock };
    discountAuditLog: { create: jest.Mock };
  };

  const baseInput = {
    tenantId: 't1',
    module: 'OPD' as const,
    discountPercent: 5,
    discountAmount: 500,
    referenceType: 'OpdBill',
    referenceId: 'bill1',
    originalAmount: 10000,
    finalAmount: 9500,
    reasonId: 'r1',
    appliedByUserId: 'u1',
  };

  beforeEach(() => {
    prisma = {
      discountReason: { findFirst: jest.fn() },
      discountApproval: { findFirst: jest.fn() },
      discountAuditLog: {
        create: jest.fn().mockResolvedValue({
          id: 'log1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }),
      },
    };
    service = new DiscountValidationService(prisma as any);
  });

  it('auto-approves and records an audit log within threshold', async () => {
    prisma.discountReason.findFirst.mockResolvedValue({
      id: 'r1',
      reason: 'Camp Discount',
      applicableType: 'BOTH',
      approvalThresholdPct: 10,
      requiresApproval: false,
    });

    const result = await service.validateAndLog(baseInput);

    expect(result.approvalRequired).toBe(false);
    expect(result.approvalId).toBeNull();
    expect(prisma.discountAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discountReasonId: 'r1',
          approvalAuthorityId: null,
        }),
      }),
    );
  });

  it('throws when no reason is provided', async () => {
    await expect(
      service.validateAndLog({ ...baseInput, reasonId: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when reason does not belong to the tenant', async () => {
    prisma.discountReason.findFirst.mockResolvedValue(null);
    await expect(service.validateAndLog(baseInput)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires an authority when requiresApproval is true', async () => {
    prisma.discountReason.findFirst.mockResolvedValue({
      id: 'r1',
      reason: 'Staff Discount',
      applicableType: 'BOTH',
      approvalThresholdPct: null,
      requiresApproval: true,
    });

    await expect(
      service.validateAndLog({ ...baseInput, discountPercent: 15 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires an authority when discount exceeds the threshold', async () => {
    prisma.discountReason.findFirst.mockResolvedValue({
      id: 'r1',
      reason: 'Camp Discount',
      applicableType: 'BOTH',
      approvalThresholdPct: 10,
      requiresApproval: false,
    });

    await expect(
      service.validateAndLog({ ...baseInput, discountPercent: 15 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the authority limit is exceeded', async () => {
    prisma.discountReason.findFirst.mockResolvedValue({
      id: 'r1',
      reason: 'Camp Discount',
      applicableType: 'BOTH',
      approvalThresholdPct: 10,
      requiresApproval: false,
    });
    prisma.discountApproval.findFirst.mockResolvedValue({
      id: 'a1',
      authorityName: 'HOD',
      applicableType: 'BOTH',
      maxDiscountPct: 20,
      maxDiscountAmount: null,
      isUnlimited: false,
      hospitalUserId: 'mgr1',
    });

    await expect(
      service.validateAndLog({
        ...baseInput,
        discountPercent: 25,
        approvalId: 'a1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stamps the authority user and records audit on a valid approval', async () => {
    prisma.discountReason.findFirst.mockResolvedValue({
      id: 'r1',
      reason: 'Staff Discount',
      applicableType: 'BOTH',
      approvalThresholdPct: 10,
      requiresApproval: false,
    });
    prisma.discountApproval.findFirst.mockResolvedValue({
      id: 'a1',
      authorityName: 'Medical Superintendent',
      applicableType: 'BOTH',
      maxDiscountPct: 50,
      maxDiscountAmount: null,
      isUnlimited: false,
      hospitalUserId: 'ms1',
    });

    const result = await service.validateAndLog({
      ...baseInput,
      discountPercent: 30,
      approvalId: 'a1',
    });

    expect(result.approvalRequired).toBe(true);
    expect(result.approvedByUserId).toBe('ms1');
    expect(result.approvalName).toBe('Medical Superintendent');
    expect(prisma.discountAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it('ignores limits when isUnlimited is true', async () => {
    prisma.discountReason.findFirst.mockResolvedValue({
      id: 'r1',
      reason: 'Staff Discount',
      applicableType: 'BOTH',
      approvalThresholdPct: 0,
      requiresApproval: true,
    });
    prisma.discountApproval.findFirst.mockResolvedValue({
      id: 'a1',
      authorityName: 'Director',
      applicableType: 'BOTH',
      maxDiscountPct: 0,
      maxDiscountAmount: null,
      isUnlimited: true,
      hospitalUserId: null,
    });

    const result = await service.validateAndLog({
      ...baseInput,
      discountPercent: 90,
      approvalId: 'a1',
    });

    expect(result.approvalRequired).toBe(true);
    expect(result.approvedByUserId).toBeNull();
  });
});
