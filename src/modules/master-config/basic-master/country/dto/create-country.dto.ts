import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ example: 'IN', description: 'ISO country code (unique)' })
  @IsString()
  @MinLength(1, { message: 'Country code cannot be empty' })
  @MaxLength(10)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  countryCode: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(1, { message: 'Country name cannot be empty' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  countryName: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => value?.trim())
  currency?: string;

  @ApiPropertyOptional({ example: '₹' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => value?.trim())
  currencySymbol?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isBaseCurrency?: boolean;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => value?.trim())
  phoneCode?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
