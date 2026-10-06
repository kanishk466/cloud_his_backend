import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'LAB-001' })
  @IsOptional() @IsString() @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  serviceCode?: string;

  @ApiPropertyOptional({ example: 'Complete Blood Count (CBC)' })
  @IsOptional() @IsString() @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  serviceName?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  baseRate?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ example: '85025' })
  @IsOptional() @IsString() @MaxLength(40)
  cptCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isInsuranceClaimItem?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  rateEditable?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  discountable?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  purchaseTaxPct?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  saleTaxPct?: number;

  @ApiPropertyOptional({ example: 'ml' })
  @IsOptional() @IsString() @MaxLength(20)
  itemUom?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt()
  minAge?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt()
  maxAge?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
