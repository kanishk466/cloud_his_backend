import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';

export class VerifyPermissionDto {
  @IsUUID()
  @IsNotEmpty()
  hospitalUserId: string;

  @IsUUID()
  @IsNotEmpty()
  labDepartmentId: string;

  @IsIn(['VERIFY', 'APPROVE_LOCK'])
  action!: 'VERIFY' | 'APPROVE_LOCK';
}
