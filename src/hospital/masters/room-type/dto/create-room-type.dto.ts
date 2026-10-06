import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WardGenderRestriction } from '@prisma/client';

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'ICU' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'ICU' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  abbreviation?: string;

  @ApiPropertyOptional({ example: 'Intensive Care Unit' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  selfBillingCategory?: boolean;

  @ApiPropertyOptional({ example: 'ICU' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  billingCategory?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDialysis?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDaycare?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isDiscountable?: boolean;

  @ApiPropertyOptional({
    enum: WardGenderRestriction,
    example: 'ANY',
    default: 'ANY',
  })
  @IsOptional()
  @IsEnum(WardGenderRestriction)
  genderRestriction?: WardGenderRestriction;

  @ApiPropertyOptional({ description: 'ServiceItem id used as daily room charge' })
  @IsOptional()
  @IsUUID()
  dailyChargeItemId?: string;

  @ApiPropertyOptional({ example: 50000, description: 'IPD threshold limit amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  thresholdLimitAmount?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
