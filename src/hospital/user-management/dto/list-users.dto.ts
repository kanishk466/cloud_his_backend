import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { HospitalUserStatus } from '@prisma/client';

export class ListUsersDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  departmentId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roleId?: number;

  @IsOptional()
  @IsEnum(HospitalUserStatus)
  status?: HospitalUserStatus;

  @IsOptional()
  @IsString()
  search?: string;
}