import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateReferenceRangeDto {
  @IsUUID()
  @IsNotEmpty()
  observationId: string;

  /** Omit = applies to ALL genders. */
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  /** Omit = no lower age bound. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAgeYears?: number;

  /** Omit = no upper age bound. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAgeYears?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  minValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  maxValue?: number;

  /** For TEXT type observations, e.g., "Negative", "No growth". */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  normalText?: string;

  /** Below this value = critical alert. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  criticalLow?: number;

  /** Above this value = critical alert. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  criticalHigh?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
