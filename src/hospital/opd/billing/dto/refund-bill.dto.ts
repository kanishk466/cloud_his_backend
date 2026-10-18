import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * POST /opd/billing/:billId/refund
 *
 * Creates a Credit Note against a bill. The original bill is NEVER deleted
 * or financially rewritten without a matching credit-note record (audit lock).
 */
export class RefundBillDto {
  /** Refund amount. Omit for a full refund of the refundable balance. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  /** Why the refund is being issued — mandatory for audit. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  /** Mode the money goes back in. Defaults to the original payment mode. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refundMode?: string;

  /** User authorizing the refund (senior/admin). */
  @IsOptional()
  @IsUUID()
  authorizedBy?: string;

  /** Optional free-text note stored on the credit note. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
