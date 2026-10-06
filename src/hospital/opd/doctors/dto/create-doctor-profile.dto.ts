import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorType, Gender } from '@prisma/client';

export class CreateDoctorProfileDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  hospitalUserId!: string;

  @ApiPropertyOptional({ description: 'DoctorSpecialization id (preferred)' })
  @IsOptional()
  @IsUUID()
  specializationId?: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  specialization!: string;

  @ApiPropertyOptional({ example: 'MBBS, MD' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  qualifications?: string;

  @ApiPropertyOptional({ example: 'Consultant Cardiologist' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  designation?: string;

  @ApiPropertyOptional({ example: 'Dr.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  title?: string;

  @ApiPropertyOptional({ example: 'MBBS, MD (Cardiology)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  degree?: string;

  @ApiPropertyOptional({ example: 'MCI-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  medicalRegNo?: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  consultationFee!: number;

  @ApiPropertyOptional({ enum: DoctorType, example: 'FULL_TIME', default: 'FULL_TIME' })
  @IsOptional()
  @IsEnum(DoctorType)
  doctorType?: DoctorType;

  @ApiPropertyOptional({ example: 30, description: 'Doctor share %' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  doctorShare?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  discountApplicable?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  emergencyAvailable?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/sig/abc.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  digitalSignatureUrl?: string;

  @ApiPropertyOptional({ example: 'City Care Hospital' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prescriptionHeader1?: string;

  @ApiPropertyOptional({ example: 'Reg. No. XYZ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prescriptionHeader2?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F', description: 'Tax PIN (multi-country ready)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxPin?: string;

  @ApiPropertyOptional({ example: 15, default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  slotDurationMins?: number = 15;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  bufferTimeMins?: number = 0;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxPatientsPerDay?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxPatientsPerSlot?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
