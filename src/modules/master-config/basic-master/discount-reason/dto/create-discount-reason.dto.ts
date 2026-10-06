import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountApplicableType } from '@prisma/client';

export class CreateDiscountReasonDto {
  @ApiProperty({ example: 'CAMP', description: 'Short unique code' })
  @IsString()
  @MinLength(1, { message: 'Code cannot be empty' })
  @MaxLength(30)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  code: string;

  @ApiProperty({ example: 'Camp Discount' })
  @IsString()
  @MinLength(1, { message: 'Reason cannot be empty' })
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional({
    enum: DiscountApplicableType,
    example: 'BOTH',
    default: 'BOTH',
  })
  @IsOptional()
  @IsEnum(DiscountApplicableType, {
    message: 'applicableType must be one of: OPD, IPD, BOTH',
  })
  applicableType?: DiscountApplicableType;

  @ApiPropertyOptional({ example: 5, description: 'Optional default % for quick-apply' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultDiscountPct?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Discounts above this % require approval',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  approvalThresholdPct?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
