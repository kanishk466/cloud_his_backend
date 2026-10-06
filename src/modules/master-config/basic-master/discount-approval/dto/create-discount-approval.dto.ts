import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsNumber,
  IsInt,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountApplicableType } from '@prisma/client';

export class CreateDiscountApprovalDto {
  @ApiProperty({ example: 'HOD', description: 'Short unique code' })
  @IsString()
  @MinLength(1, { message: 'Code cannot be empty' })
  @MaxLength(30)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  code: string;

  @ApiProperty({ example: 'Head of Department' })
  @IsString()
  @MinLength(1, { message: 'Authority name cannot be empty' })
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  authorityName: string;

  @ApiPropertyOptional({ description: 'Optional HospitalUser id holding this authority' })
  @IsOptional()
  @IsUUID()
  hospitalUserId?: string;

  @ApiPropertyOptional({ enum: DiscountApplicableType, example: 'BOTH', default: 'BOTH' })
  @IsOptional()
  @IsEnum(DiscountApplicableType)
  applicableType?: DiscountApplicableType;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPct?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Max discount amount cap' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: false, default: false, description: 'Unlimited authority' })
  @IsOptional()
  @IsBoolean()
  isUnlimited?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  requiresReason?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
