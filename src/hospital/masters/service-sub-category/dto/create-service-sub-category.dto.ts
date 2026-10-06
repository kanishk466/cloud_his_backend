import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceSubCategoryDto {
  @ApiProperty({ description: 'Parent service category id' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'General Consultation' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  subCategoryName: string;

  @ApiPropertyOptional({ example: 'OPD Consult' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  displayName?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  printOrder?: number;

  @ApiPropertyOptional({ example: 'GC' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  abbreviation?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
