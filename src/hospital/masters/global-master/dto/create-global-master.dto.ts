import { IsString, IsEnum, IsOptional, IsInt, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MasterCategory, MasterValueType } from '@prisma/client';

export class CreateGlobalMasterDto {
  @IsEnum(MasterCategory, {
    message: 'Category must be one of: PANEL_BILLING, CLINICAL, INVENTORY, GENERAL',
  })
  category: MasterCategory;

  @IsEnum(MasterValueType, {
    message: 'Invalid master value type',
  })
  type: MasterValueType;

  @IsString()
  @MinLength(1, { message: 'Value cannot be empty' })
  @MaxLength(100, { message: 'Value cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  value: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}