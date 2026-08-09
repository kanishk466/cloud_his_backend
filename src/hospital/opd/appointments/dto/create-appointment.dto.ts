import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsUUID,
  Min,
  Max,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum AppointmentType {
  WALK_IN = 'WALK_IN',
  SCHEDULED = 'SCHEDULED',
  EMERGENCY = 'EMERGENCY',
  TELECONSULTATION = 'TELECONSULTATION',
}

export enum VisitType {
  NEW_VISIT = 'NEW_VISIT',
  FOLLOW_UP = 'FOLLOW_UP',
  REVIEW = 'REVIEW',
  REFERRAL = 'REFERRAL',
  POST_OP = 'POST_OP',
  EMERGENCY = 'EMERGENCY',
}

export class CreateAppointmentDto {
  // ─── PATIENT ──────────────────────────────────────────────────
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  // ─── DOCTOR ───────────────────────────────────────────────────
  @IsUUID()
  @IsNotEmpty()
  doctorProfileId!: string;

  // ─── DEPARTMENT (optional) ────────────────────────────────────
  @IsOptional()
  @IsInt()
  departmentId?: number;

  // ─── SCHEDULE ─────────────────────────────────────────────────
  // Format: "2025-06-10" (ISO Date)
  @IsDateString()
  @IsNotEmpty()
  appointmentDate!: string;

  // Format: "10:30" (HH:MM 24hr)
  // Required only for SCHEDULED type
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'slotStartTime must be in HH:MM format (e.g. 10:30)',
  })
  slotStartTime?: string;

  // ─── TYPE & CLASSIFICATION ────────────────────────────────────
  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  @IsEnum(VisitType)
  visitType!: VisitType;

  // 0 = Normal | 1 = Urgent | 2 = Emergency
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  priority?: number = 0;

  // ─── REFERRAL ─────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  referredByDoctorName?: string;

  @IsOptional()
  @IsString()
  referralNote?: string;

  // ─── PATIENT INPUT ────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reasonForVisit?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}