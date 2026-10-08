import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSignoffAuthorityDto {
  /** Doctor/Pathologist/Biochemist user (HospitalUser of this tenant). */
  @IsUUID()
  @IsNotEmpty()
  hospitalUserId: string;

  /** Omit = can sign for ALL lab departments. */
  @IsOptional()
  @IsUUID()
  labDepartmentId?: string;

  /** e.g., "Consultant Pathologist (MD, DNB)", "Chief Microbiologist". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  designationText: string;

  /** Registration council number printed on reports. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  medicalRegNo?: string;

  /** Can mark reports VERIFIED (technical review). */
  @IsOptional()
  @IsBoolean()
  canVerify?: boolean;

  /** Can give final sign-off & LOCK reports (APPROVED). */
  @IsOptional()
  @IsBoolean()
  canApproveLock?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
