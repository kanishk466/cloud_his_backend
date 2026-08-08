import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVitalsDto {
  // ─── REQUIRED: Patient link ───────────────────────────────────
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  // ─── OPTIONAL: Appointment link ───────────────────────────────
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  // ─── OPTIONAL: Consultation link ──────────────────────────────
  @IsOptional()
  @IsUUID()
  consultationId?: string;

  // ─── ANTHROPOMETRY ────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(300)
  heightCm?: number; // cm

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(500)
  weightKg?: number; // kg

  // BMI is auto-calculated — not accepted from client

  // ─── TEMPERATURE ──────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(90.0)
  @Max(110.0)
  temperatureF?: number;

  // ─── CARDIOVASCULAR ───────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(300)
  bloodPressureSys?: number; // Systolic

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(200)
  bloodPressureDia?: number; // Diastolic

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(250)
  pulseRate?: number; // beats/min

  // ─── RESPIRATORY ──────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  respiratoryRate?: number; // breaths/min

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(50.0)
  @Max(100.0)
  spo2?: number; // %

  // ─── BLOOD SUGAR ──────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(10)
  @Max(900)
  bloodSugarFasting?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(10)
  @Max(900)
  bloodSugarPP?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(10)
  @Max(900)
  bloodSugarRandom?: number;

  // ─── PAIN ASSESSMENT ─────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;

  // ─── CLINICAL INPUT BY NURSE ──────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}