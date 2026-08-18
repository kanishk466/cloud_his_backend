import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsMobilePhone,
  IsDateString,
  IsInt,
  IsIn,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum BloodGroup {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  UNKNOWN = 'UNKNOWN',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export enum RelationType {
  SELF = 'SELF',
  SPOUSE = 'SPOUSE',
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  SON = 'SON',
  DAUGHTER = 'DAUGHTER',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
  GUARDIAN = 'GUARDIAN',
  OTHER = 'OTHER',
}

export class CreatePatientDto {
  // ─── PERSONAL DETAILS ─────────────────────────────────────────
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string; // "1990-06-15" ISO format

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsIn(['years', 'months', 'days'])
  ageUnit?: string;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  // ─── CONTACT ──────────────────────────────────────────────────
  @IsMobilePhone('en-IN')
  mobile!: string;

  @IsOptional()
  @IsMobilePhone('en-IN')
  alternateMobile?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email?: string;

  // ─── ADDRESS ──────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'pincode must be a valid 6-digit Indian pincode',
  })
  pincode?: string;

  // ─── IDENTITY DOCUMENTS ───────────────────────────────────────
  @IsOptional()
  @Matches(/^[2-9]{1}[0-9]{11}$/, {
    message: 'aadhaarNumber must be a valid 12-digit Aadhaar number',
  })
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  abhaId?: string;

  // ─── GUARDIAN / NOK ───────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianName?: string;

  @IsOptional()
  @IsEnum(RelationType)
  guardianRelation?: RelationType;

  @IsOptional()
  @IsMobilePhone('en-IN')
  guardianMobile?: string;

  // ─── INSURANCE ────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNo?: string;

  @IsOptional()
  @IsDateString()
  insuranceValidTill?: string;

  // ─── MEDICAL BASICS ───────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(500)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  chronicDiseases?: string;
}