import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ObservationDataType } from '@prisma/client';

export class CreateObservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code may contain only letters, digits, underscore and hyphen',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code: string;

  @IsOptional()
  @IsEnum(ObservationDataType)
  dataType?: ObservationDataType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  decimalPlaces?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** Critical value alert flag. */
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  /** Required when dataType = SELECT. */
  @ValidateIf((o) => o.dataType === 'SELECT')
  @IsArray()
  @ArrayNotEmpty({ message: 'selectOptions is required for SELECT dataType' })
  @IsString({ each: true })
  selectOptions?: string[];

  /** Required when dataType = CALCULATED, e.g. "TCHOL - HDL - (TRIG/5)". */
  @ValidateIf((o) => o.dataType === 'CALCULATED')
  @IsString()
  @IsNotEmpty({
    message: 'formulaExpression is required for CALCULATED dataType',
  })
  @MaxLength(500)
  formulaExpression?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
