import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { DiscountApplicableType } from '@prisma/client';

export interface ValidateDiscountInput {
  tenantId: string;
  /** Module context: OPD or IPD. */
  module: DiscountApplicableType;
  /** Discount percentage being applied (0–100). */
  discountPercent: number;
  /** Absolute discount amount (optional, used against amount caps). */
  discountAmount?: number;
  /** Reference document this discount is applied on (e.g. OpdBill id). */
  referenceType: string;
  referenceId: string;
  originalAmount: number;
  finalAmount: number;
  /** Selected DiscountReason.id (mandatory). */
  reasonId: string;
  /** Selected DiscountApproval.id (mandatory when approval is required). */
  approvalId?: string;
  /** The user actually applying the discount (for audit). */
  appliedByUserId: string;
  remarks?: string;
}

export interface ValidateDiscountResult {
  reasonId: string;
  reasonName: string;
  approvalId: string | null;
  approvalName: string | null;
  approvedByUserId: string | null;
  discountPercent: number;
  discountAmount: number;
  approvalRequired: boolean;
  auditLogId: string;
  validatedAt: string;
}

/**
 * Reusable discount validation engine (aligned with DB design).
 *
 * Standalone — OPD / IPD / any module can call it to:
 *   1. Enforce that a reason is always selected.
 *   2. Detect when the discount requires approval (reason.requiresApproval or
 *      discount > reason.approvalThresholdPct).
 *   3. Verify the selected approval authority is valid for tenant + module.
 *   4. Enforce the authority's percentage / amount limits (unless isUnlimited).
 *   5. Write a DiscountAuditLog row with reason_id, authority_id, approved_by.
 */
@Injectable()
export class DiscountValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAndLog(input: ValidateDiscountInput): Promise<ValidateDiscountResult> {
    const {
      tenantId,
      module,
      discountPercent,
      discountAmount = 0,
      referenceType,
      referenceId,
      originalAmount,
      finalAmount,
      reasonId,
      approvalId,
      appliedByUserId,
      remarks,
    } = input;

    if (discountPercent < 0 || discountPercent > 100) {
      throw new BadRequestException('discountPercent must be between 0 and 100.');
    }

    // ── 1. Reason is mandatory and must belong to this tenant ──────
    if (!reasonId) {
      throw new BadRequestException('A discount reason is mandatory.');
    }
    const reason = await this.prisma.discountReason.findFirst({
      where: { id: reasonId, tenantId, deletedAt: null, isActive: true },
    });
    if (!reason) {
      throw new BadRequestException('Invalid discount reason.');
    }
    if (reason.applicableType !== 'BOTH' && reason.applicableType !== module) {
      throw new BadRequestException(
        `Discount reason '${reason.reason}' does not apply to ${module}.`,
      );
    }

    // ── 2. Is approval required? ───────────────────────────────────
    const threshold =
      reason.approvalThresholdPct !== null && reason.approvalThresholdPct !== undefined
        ? Number(reason.approvalThresholdPct)
        : null;
    const approvalRequired =
      reason.requiresApproval || (threshold !== null && discountPercent > threshold);

    let approval: any = null;
    if (approvalRequired) {
      // ── 3. Approval mandatory → authority must be supplied & valid ──
      if (!approvalId) {
        throw new ForbiddenException(
          `Discount of ${discountPercent}% requires an approval authority for '${reason.reason}'.`,
        );
      }
      approval = await this.prisma.discountApproval.findFirst({
        where: { id: approvalId, tenantId, deletedAt: null, isActive: true },
      });
      if (!approval) {
        throw new BadRequestException('Invalid discount approval authority.');
      }
      if (approval.applicableType !== 'BOTH' && approval.applicableType !== module) {
        throw new BadRequestException(
          `Approval authority '${approval.authorityName}' does not apply to ${module}.`,
        );
      }

      // ── 4. Enforce authority limits (skip when unlimited) ──────────
      if (!approval.isUnlimited) {
        if (discountPercent > Number(approval.maxDiscountPct)) {
          throw new ForbiddenException(
            `'${approval.authorityName}' can approve up to ${approval.maxDiscountPct}% only; ${discountPercent}% requested.`,
          );
        }
        if (
          approval.maxDiscountAmount !== null &&
          approval.maxDiscountAmount !== undefined &&
          discountAmount > Number(approval.maxDiscountAmount)
        ) {
          throw new ForbiddenException(
            `'${approval.authorityName}' can approve up to ₹${approval.maxDiscountAmount}; ₹${discountAmount} requested.`,
          );
        }
      }
    }

    // ── 5. Write the audit log ─────────────────────────────────────
    const auditLog = await this.prisma.discountAuditLog.create({
      data: {
        tenantId,
        module,
        referenceType,
        referenceId,
        discountReasonId: reason.id,
        approvalAuthorityId: approval?.id ?? null,
        discountPct: discountPercent,
        discountAmount,
        originalAmount,
        finalAmount,
        approvedByUserId: approval?.hospitalUserId ?? (approvalRequired ? null : appliedByUserId),
        appliedByUserId,
        remarks,
      },
    });

    return {
      reasonId: reason.id,
      reasonName: reason.reason,
      approvalId: approval?.id ?? null,
      approvalName: approval?.authorityName ?? null,
      approvedByUserId: approval?.hospitalUserId ?? (approvalRequired ? null : appliedByUserId),
      discountPercent,
      discountAmount,
      approvalRequired,
      auditLogId: auditLog.id,
      validatedAt: auditLog.createdAt.toISOString(),
    };
  }
}
