import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export const ADMISSION_TYPES = [
  'EMERGENCY',
  'PLANNED',
  'TRANSFER',
  'DAYCARE',
] as const;

export class CreateAdmissionDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @IsUUID()
  @IsNotEmpty()
  doctorProfileId: string;

  /** Optional — bed can be assigned later via /assign-bed. */
  @IsOptional()
  @IsUUID()
  bedId?: string;

  /** Panel for credit billing; omit for self-pay. */
  @IsOptional()
  @IsUUID()
  panelId?: string;

  /** External refer doctor who sent this patient. */
  @IsOptional()
  @IsUUID()
  referDoctorId?: string;

  @IsOptional()
  @IsIn(ADMISSION_TYPES)
  admissionType?: (typeof ADMISSION_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  provisionalDiagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonForAdmission?: string;

  /** Auto-set to +24h for DAYCARE when omitted. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedDischargeDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advancePaid?: number;
}
