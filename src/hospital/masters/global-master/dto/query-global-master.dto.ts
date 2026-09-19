import { IsOptional, IsString, IsEnum } from 'class-validator';
import { MasterValueType } from '@prisma/client';

export class QueryGlobalMasterDto {
  @IsOptional()
  @IsEnum(MasterValueType)
  type?: MasterValueType;

  @IsOptional()
  @IsString()
  search?: string;
}