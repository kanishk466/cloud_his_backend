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

export class CreateStateDto {
  @ApiProperty({ description: 'Parent country id' })
  @IsUUID()
  countryId: string;

  @ApiProperty({ example: 'MH', description: 'State code (unique within country)' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  stateCode: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  stateName: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
