import {
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateConsultationDto {
  // ─── SUBJECTIVE ───────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chiefComplaints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  historyOfIllness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pastHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  familyHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personalHistory?: string;

  // ─── OBJECTIVE ────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  generalExamination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  systemicExamination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  localExamination?: string;

  // ─── ASSESSMENT ───────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  provisionalDiagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  finalDiagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  icdCodes?: string[];

  // ─── PLAN ─────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialInstructions?: string;

  // ─── FOLLOW UP ────────────────────────────────────────────────
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  followUpNotes?: string;

  // ─── REFERRAL ─────────────────────────────────────────────────
  @IsOptional()
  @IsUUID()
  referredToDoctorId?: string;

  @IsOptional()
  @IsString()
  referredToDepartment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referralReason?: string;
}