import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCityDto {
  @ApiProperty({ description: 'Parent district id' })
  @IsUUID()
  districtId: string;

  @ApiProperty({ example: 'PUN', description: 'City code (unique within district)' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  cityCode: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  cityName: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
