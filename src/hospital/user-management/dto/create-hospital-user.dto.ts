import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HospitalUserType, Gender, LoginType } from '@prisma/client';

export class UserInfoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  alternateMobile?: string;

  @IsEnum(HospitalUserType)
  @IsNotEmpty()
  userType!: HospitalUserType;
}

export class StaffProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  title?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @IsUUID()
  reportingManagerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  panNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  medicalRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  qualification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  emergencyContact?: string;
}

export class CredentialsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsEnum(LoginType)
  @IsNotEmpty()
  loginType!: LoginType;

  @IsOptional()
  @IsDateString()
  accountValidTill?: string;

  @IsBoolean()
  forcePasswordChange!: boolean;


  @IsBoolean()
  twoFactorEnabled!: boolean;

  @IsBoolean()
  sendCredentialsViaSms!: boolean;

  @IsBoolean()
  sendCredentialsViaEmail!: boolean;
}

export class RolesDto {
  @IsUUID()
  @IsNotEmpty()
  primaryRoleId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalRoleIds?: string[];
}

export class ModuleFeaturePairDto {
  @IsUUID()
  moduleId!: string;

  @IsUUID()
  featureId!: string;
}

export class CreateHospitalUserDto {
  @ValidateNested()
  @Type(() => UserInfoDto)
  userInfo!: UserInfoDto;

  @ValidateNested()
  @Type(() => StaffProfileDto)
  staffProfile!: StaffProfileDto;

  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials!: CredentialsDto;

  @ValidateNested()
  @Type(() => RolesDto)
  roles!: RolesDto;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleFeaturePairDto)
  permissions!: ModuleFeaturePairDto[];
}