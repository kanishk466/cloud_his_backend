import { IsEnum } from 'class-validator';
import { HospitalUserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(HospitalUserStatus, { message: 'status must be ACTIVE or INACTIVE' })
  status!: HospitalUserStatus;
}
