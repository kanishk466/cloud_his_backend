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

export class CreateDistrictDto {
  @ApiProperty({ description: 'Parent state id' })
  @IsUUID()
  stateId: string;

  @ApiProperty({ example: 'PUN', description: 'District code (unique within state)' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  districtCode: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  districtName: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
