import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { HospitalUserStatus } from '@prisma/client';

export class ListUsersDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsEnum(HospitalUserStatus)
  status?: HospitalUserStatus;

  @IsOptional()
  @IsString()
  search?: string;
}