import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PrescriptionFrequency {
  ONCE_DAILY = 'ONCE_DAILY',
  TWICE_DAILY = 'TWICE_DAILY',
  THRICE_DAILY = 'THRICE_DAILY',
  FOUR_TIMES_DAILY = 'FOUR_TIMES_DAILY',
  EVERY_6_HOURS = 'EVERY_6_HOURS',
  EVERY_8_HOURS = 'EVERY_8_HOURS',
  EVERY_12_HOURS = 'EVERY_12_HOURS',
  AS_NEEDED = 'AS_NEEDED',
  BEFORE_MEALS = 'BEFORE_MEALS',
  AFTER_MEALS = 'AFTER_MEALS',
  AT_BEDTIME = 'AT_BEDTIME',
  STAT = 'STAT',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM',
}

export enum MealRelation {
  BEFORE_FOOD = 'BEFORE_FOOD',
  AFTER_FOOD = 'AFTER_FOOD',
  WITH_FOOD = 'WITH_FOOD',
  EMPTY_STOMACH = 'EMPTY_STOMACH',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum MedicineRoute {
  ORAL = 'ORAL',
  IV = 'IV',
  IM = 'IM',
  SC = 'SC',
  TOPICAL = 'TOPICAL',
  SUBLINGUAL = 'SUBLINGUAL',
  INHALATION = 'INHALATION',
  RECTAL = 'RECTAL',
  NASAL = 'NASAL',
  OPHTHALMIC = 'OPHTHALMIC',
  OTIC = 'OTIC',
  OTHER = 'OTHER',
}

export class AddPrescriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicineName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  genericName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  medicineType?: string; // Tablet | Capsule | Syrup etc.

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dosage?: string; // "500 mg" | "5 ml"

  @IsEnum(PrescriptionFrequency)
  frequency!: PrescriptionFrequency;

  @IsOptional()
  @IsString()
  customFrequency?: string;

  @IsEnum(MedicineRoute)
  route!: MedicineRoute;

  @IsEnum(MealRelation)
  mealRelation!: MealRelation;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  durationWeeks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}