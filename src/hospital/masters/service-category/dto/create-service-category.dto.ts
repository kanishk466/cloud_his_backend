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
import { ServiceConfigType, ServiceStoreType } from '@prisma/client';

export class CreateServiceCategoryDto {
  @ApiProperty({ enum: ServiceConfigType, example: 'OPD' })
  @IsEnum(ServiceConfigType)
  configType: ServiceConfigType;

  @ApiProperty({ example: 'Consultation' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  categoryName: string;

  @ApiPropertyOptional({ enum: ServiceStoreType, example: 'NONE', default: 'NONE' })
  @IsOptional()
  @IsEnum(ServiceStoreType)
  storeType?: ServiceStoreType;

  @ApiPropertyOptional({ example: 'CONS' })
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
