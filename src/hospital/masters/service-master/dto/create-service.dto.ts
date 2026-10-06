import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory, Gender } from '@prisma/client';

export class CreateServiceDto {
  @ApiProperty({ example: 'LAB-001' })
  @IsString() @MaxLength(50)
  serviceCode: string;

  @ApiProperty({ example: 'Complete Blood Count (CBC)' })
  @IsString() @MaxLength(200)
  serviceName: string;

  @ApiProperty({ enum: ServiceCategory, example: 'LAB' })
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @ApiProperty({ example: 500 })
  @Type(() => Number) @IsNumber() @Min(0)
  baseRate: number;

  // ─── Hierarchy (Phase 2.1) ─────────────────────────────────────
  @ApiPropertyOptional({ description: 'ServiceCategory id' })
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ServiceSubCategory id' })
  @IsOptional() @IsUUID()
  subCategoryId?: string;

  @ApiPropertyOptional({ description: 'ServiceItemType id' })
  @IsOptional() @IsUUID()
  itemTypeId?: string;

  @ApiPropertyOptional({ example: 'CBC' })
  @IsOptional() @IsString() @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ example: '85025', description: 'CPT / item code' })
  @IsOptional() @IsString() @MaxLength(40)
  cptCode?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional() @IsBoolean()
  isInsuranceClaimItem?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  rateEditable?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  discountable?: boolean;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  purchaseTaxPct?: number;

  @ApiPropertyOptional({ example: 12, default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  saleTaxPct?: number;

  @ApiPropertyOptional({ example: 'ml' })
  @IsOptional() @IsString() @MaxLength(20)
  itemUom?: string;

  @ApiPropertyOptional({ enum: Gender, example: 'MALE' })
  @IsOptional() @IsEnum(Gender)
  applicableGender?: Gender;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  minAge?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  maxAge?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
