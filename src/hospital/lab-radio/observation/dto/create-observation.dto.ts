import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LabResultType } from '@prisma/client';

export class CreateObservationDto {
  @ApiProperty({ example: 'Hemoglobin' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'g/dL' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => value?.trim())
  unit?: string;

  @ApiPropertyOptional({ enum: LabResultType, example: 'NUMERIC', default: 'NUMERIC' })
  @IsOptional()
  @IsEnum(LabResultType)
  resultType?: LabResultType;

  @ApiPropertyOptional({
    example: 'TotalChol - HDL - (Trig/5)',
    description: 'Expression for computed observations (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  formulaExpression?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
