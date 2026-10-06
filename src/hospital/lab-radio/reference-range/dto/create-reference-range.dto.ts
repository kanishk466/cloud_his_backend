import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LabRangeGender, LabAgeUnit } from '@prisma/client';

export class CreateReferenceRangeDto {
  @ApiPropertyOptional({ enum: LabRangeGender, example: 'ANY', default: 'ANY' })
  @IsOptional()
  @IsEnum(LabRangeGender)
  gender?: LabRangeGender;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number;

  @ApiPropertyOptional({ enum: LabAgeUnit, example: 'YEARS', default: 'YEARS' })
  @IsOptional()
  @IsEnum(LabAgeUnit)
  ageUnit?: LabAgeUnit;

  @ApiPropertyOptional({ example: 13 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minValue?: number;

  @ApiPropertyOptional({ example: 17 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  panicLow?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  panicHigh?: number;

  @ApiPropertyOptional({ example: 'Normal adult range' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
