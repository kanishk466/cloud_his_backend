import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { InterpretationCondition } from '@prisma/client';

export const INTERPRETATION_SEVERITIES = [
  'INFO',
  'WARNING',
  'CRITICAL',
] as const;

export class CreateInterpretationDto {
  @IsUUID()
  @IsNotEmpty()
  observationId: string;

  @IsEnum(InterpretationCondition)
  condition: InterpretationCondition;

  /** Required for EQUALS (numeric compare). Range-based conditions read
   *  bounds from the applicable ReferenceRange, not this field. */
  @ValidateIf((o) => o.condition === 'EQUALS')
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  thresholdValue?: number;

  /** Required for CONTAINS. */
  @ValidateIf((o) => o.condition === 'CONTAINS')
  @IsString()
  @IsNotEmpty({ message: 'thresholdText is required for CONTAINS condition' })
  @MaxLength(200)
  thresholdText?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  interpretationText: string;

  @IsOptional()
  @IsIn(INTERPRETATION_SEVERITIES)
  severity?: (typeof INTERPRETATION_SEVERITIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
