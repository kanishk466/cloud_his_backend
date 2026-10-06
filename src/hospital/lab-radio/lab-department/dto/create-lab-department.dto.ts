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
import { LabCategory } from '@prisma/client';

export class CreateLabDepartmentDto {
  @ApiProperty({ enum: LabCategory, example: 'LAB' })
  @IsEnum(LabCategory)
  category: LabCategory;

  @ApiProperty({ example: 'Biochemistry' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'Biochem' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  allowTemplates?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
