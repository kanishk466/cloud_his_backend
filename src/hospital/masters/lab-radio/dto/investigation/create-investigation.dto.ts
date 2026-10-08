import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SpecimenType } from '@prisma/client';

export class CreateInvestigationDto {
  @IsUUID()
  @IsNotEmpty()
  labDepartmentId: string;

  /** Billing link — must be an active ServiceMaster of this tenant. */
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code may contain only letters, digits, underscore and hyphen',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @IsOptional()
  @IsEnum(SpecimenType)
  specimenType?: SpecimenType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  specimenVolume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  containerColor?: string;

  @IsOptional()
  @IsBoolean()
  fastingRequired?: boolean;

  /** e.g., "NUMERIC_TABLE", "DESCRIPTIVE", "IMAGE". */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  reportingFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  outsourceLabName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  outsourceTatHours?: number;

  /** Pre-analytical linkage: specimen type for this test. */
  @IsOptional()
  @IsUUID()
  sampleTypeId?: string;

  /** Pre-analytical linkage: explicit tube override (else sample type's default). */
  @IsOptional()
  @IsUUID()
  sampleContainerId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
