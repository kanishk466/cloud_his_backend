import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsDateString,
  IsInt,
  IsIn,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  IsBoolean,
  IsNumber,
  IsUUID, // 👈 Added IsUUID for panelId validation
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PatientType } from '@prisma/client';

/**
 * Phone guard used for all mobile fields: accepts the historical Indian
 * inputs (9845011223 / 09845011223 / 919845011223) as well as international
 * numbers in E.164 style (+17519148048, +919845011223). The registration
 * screen normalises "+1 (751) 914-8048" → "+17519148048" before calling us.
 */
const PHONE_PATTERN = /^(\+[1-9]\d{6,14}|0?[6-9]\d{9}|91[6-9]\d{9})$/;

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
  @IsInt()
  @Min(0)
  @Max(150)
  ageAtRegistration?: number; // 👈 Added ageAtRegistration

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
  @Matches(PHONE_PATTERN, { message: 'mobile must be a valid phone number' })
  mobile!: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, {
    message: 'alternateMobile must be a valid phone number',
  })
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
  @Matches(PHONE_PATTERN, {
    message: 'guardianMobile must be a valid phone number',
  })
  guardianMobile?: string;

  // ─── INSURANCE & PANEL ────────────────────────────────────────
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNo?: string;

  @IsOptional()
  @IsDateString()
  insuranceValidTill?: string;

  @IsOptional()
  @IsUUID()
  panelId?: string; // 👈 Added panelId

  @IsOptional()
  @IsDateString()
  panelValidTill?: string; // 👈 Added panelValidTill

  // ─── MEDICAL BASICS ───────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(500)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  chronicDiseases?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  empId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  consultingDoctor?: string;

  /** External refer doctor who sent this patient (ReferDoctor). */
  @IsOptional()
  @IsUUID()
  referDoctorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  department?: string;

  // ─── CONSENT ──────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  consentToShare?: boolean; // 👈 Added consentToShare

  // Existing enum column (NEW | REVIEW | REFERRAL | EMERGENCY) —
  // surfaced in the registration form as "Patient Type".
  @IsOptional()
  @IsEnum(PatientType)
  patientType?: PatientType;

  // ─── EXTENDED REGISTRATION FIELDS (all optional) ───────────────
  // Personal extras
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(400)
  pregnancyDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  staffId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dependentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  familyNumber?: string;

  // Contact / address extras
  @IsOptional()
  @IsString()
  @MaxLength(255)
  permanentAddress?: string;

  // Identity extras
  @IsOptional()
  @IsString()
  @MaxLength(50)
  idProofName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idProofNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nationalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  passportNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  kraPin?: string;

  // Other details
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthPlace?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  membershipNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  identityMark1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  identityMark2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mlcType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mlcNo?: string;

  // International patient
  @IsOptional()
  @IsBoolean()
  isInternational?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  internationalNo?: string;

  // Emergency contact
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyLastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  emergencyMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyResidentNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyAddress?: string;

  // Scheme details
  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insurance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyCardNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameOnCard?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cardHolder?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvalAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  approvalRemark?: string;
}
