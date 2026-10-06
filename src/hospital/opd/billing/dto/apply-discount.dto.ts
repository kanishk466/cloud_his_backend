import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyDiscountDto {
  // Either percent or amount (not both)
  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 'Camp Discount' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  discountReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountAuthorizedBy?: string;

  // ── Structured discount (Phase 1.2) ──────────────────────────────
  // When provided, the discount is validated against the Discount Reason +
  // Approval masters and recorded in discount_audit_logs.
  @ApiPropertyOptional({ description: 'DiscountReason id (enables validation engine)' })
  @IsOptional()
  @IsUUID()
  discountReasonId?: string;

  @ApiPropertyOptional({ description: 'DiscountApproval id (required above threshold)' })
  @IsOptional()
  @IsUUID()
  discountApprovalId?: string;
}
