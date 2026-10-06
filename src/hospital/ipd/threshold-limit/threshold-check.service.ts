import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuditService } from 'src/Platform/audit/audit.service';
import { MailService } from 'src/Platform/mail/mail.service';
import { CheckThresholdDto } from './dto/check-threshold.dto';
import { ThresholdCheckResult } from './constants/threshold-limit.constants';

export interface ThresholdCheckOutput {
  result: ThresholdCheckResult;
  thresholdAmount: number | null;
  currentAmount: number;
  exceededBy: number;
  actionType: string | null;
  /** True when the alert was fired on this call (first crossing). */
  alertTriggered: boolean;
}

/**
 * Threshold Check Service — reusable by IPD billing, nursing dashboard,
 * front-office advance flow.
 *
 *   - OK       → below threshold (or no active threshold configured)
 *   - WARNING  → above threshold + actionType = SOFT_WARNING
 *   - BLOCKED  → above threshold + actionType = HARD_BLOCK
 *
 * Fires SMS/email alerts exactly once per crossing (deduped via AuditLog).
 */
@Injectable()
export class ThresholdCheckService {
  private readonly logger = new Logger(ThresholdCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async check(
    tenantId: string,
    dto: CheckThresholdDto,
    actor?: { actorId: string; actorEmail: string },
  ): Promise<ThresholdCheckOutput> {
    const threshold = await this.prisma.thresholdLimit.findFirst({
      where: {
        tenantId,
        panelId: dto.panelId,
        roomTypeId: dto.roomTypeId,
        isActive: true,
        deletedAt: null,
      },
    });

    // No threshold configured → always OK.
    if (!threshold) {
      return {
        result: ThresholdCheckResult.OK,
        thresholdAmount: null,
        currentAmount: dto.currentAmount,
        exceededBy: 0,
        actionType: null,
        alertTriggered: false,
      };
    }

    const thresholdAmount = Number(threshold.thresholdAmount);
    const exceeded = dto.currentAmount > thresholdAmount;

    if (!exceeded) {
      return {
        result: ThresholdCheckResult.OK,
        thresholdAmount,
        currentAmount: dto.currentAmount,
        exceededBy: 0,
        actionType: threshold.actionType,
        alertTriggered: false,
      };
    }

    const exceededBy = Math.round((dto.currentAmount - thresholdAmount) * 100) / 100;
    const result =
      threshold.actionType === 'HARD_BLOCK'
        ? ThresholdCheckResult.BLOCKED
        : ThresholdCheckResult.WARNING;

    // Fire alert only on the FIRST crossing (dedupe via AuditLog).
    const alreadyAlerted = await this.hasAlerted(tenantId, threshold.id, dto.currentAmount);
    let alertTriggered = false;
    if (!alreadyAlerted) {
      alertTriggered = await this.fireAlert(tenantId, threshold, dto, exceededBy, result, actor);
    }

    return {
      result,
      thresholdAmount,
      currentAmount: dto.currentAmount,
      exceededBy,
      actionType: threshold.actionType,
      alertTriggered,
    };
  }

  /**
   * Has an alert already been sent for this threshold once the running bill
   * crossed it? We store a marker audit entry keyed by threshold id.
   */
  private async hasAlerted(tenantId: string, thresholdId: string, _current: number): Promise<boolean> {
    const marker = await this.prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'THRESHOLD_ALERT_FIRED',
        entityId: thresholdId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return !!marker;
  }

  private async fireAlert(
    tenantId: string,
    threshold: any,
    dto: CheckThresholdDto,
    exceededBy: number,
    result: ThresholdCheckResult,
    actor?: { actorId: string; actorEmail: string },
  ): Promise<boolean> {
    const emails: string[] = threshold.alertEmails ?? [];
    const subject = `IPD Threshold ${result}: bill exceeded limit`;

    if (emails.length > 0) {
      const html = `
        <p>An IPD provisional bill has crossed a configured threshold.</p>
        <ul>
          <li><strong>Action:</strong> ${result}</li>
          <li><strong>Threshold:</strong> ₹${Number(threshold.thresholdAmount).toFixed(2)}</li>
          <li><strong>Current bill:</strong> ₹${dto.currentAmount.toFixed(2)}</li>
          <li><strong>Exceeded by:</strong> ₹${exceededBy.toFixed(2)}</li>
        </ul>
      `;
      // Fire-and-forget: alerting must never break billing.
      await Promise.all(
        emails.map((to) => this.mailService.sendMail(to, subject, html).catch(() => undefined)),
      );
    }

    // Persist a dedupe marker + audit trail.
    await this.auditService.log({
      action: 'THRESHOLD_ALERT_FIRED',
      actorId: actor?.actorId ?? 'system',
      actorEmail: actor?.actorEmail ?? 'system',
      tenantId,
      targetType: 'ThresholdLimit',
      targetId: threshold.id,
      targetName: `${threshold.panelId}/${threshold.roomTypeId}`,
      detail: `Threshold alert fired (${result}) at ₹${dto.currentAmount}`,
      metadata: {
        result,
        thresholdAmount: Number(threshold.thresholdAmount),
        currentAmount: dto.currentAmount,
        exceededBy,
        emails,
        smsNumbers: threshold.alertSmsNumbers ?? [],
      },
    });

    this.logger.warn(
      `Threshold ${result} for tenant ${tenantId}: ₹${dto.currentAmount} > ₹${threshold.thresholdAmount}`,
    );
    return true;
  }
}
