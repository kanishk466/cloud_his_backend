import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDiscountApprovalAuthorityDto {
  /** HospitalRole.id (must belong to the current tenant). */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  hospitalRoleId: number;

  /** Max discount % this role may approve (0–100, up to 2 decimals). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxDiscountPercent: number;

  /** Optional absolute cap (₹) per bill. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
