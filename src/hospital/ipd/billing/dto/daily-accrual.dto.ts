import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

/**
 * `POST /ipd/billing/daily-accrual`
 *
 * Posts the room-rent + nursing-charge lines for one day. Omit `admissionId`
 * to run the whole hospital (the nightly job); pass it to re-run a single
 * stay. Idempotent per admission + day + component — re-running is a no-op.
 */
export class DailyAccrualDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsUUID()
  admissionId?: string;
}
