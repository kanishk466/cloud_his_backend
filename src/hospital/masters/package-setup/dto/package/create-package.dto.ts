import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConsultTypeInPackage, PackageType } from '@prisma/client';

export class PackageComponentItemDto {
  @IsUUID()
  serviceId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PackageConsultItemDto {
  @IsOptional()
  @IsUUID()
  clinicalDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @IsOptional()
  @IsEnum(ConsultTypeInPackage)
  consultType?: ConsultTypeInPackage;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxVisits: number;
}

export class PackageExclusionItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  exclusionText: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreatePackageDto {
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
  @IsEnum(PackageType)
  packageType?: PackageType;

  /** For IPD packages: valid room type (e.g., General Ward). */
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  /** Included hospitalization days (e.g., 3 days for surgery). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  includedStayDays?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  /** Validity window for OPD packages (days). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  validityDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // ─── Optional nested structure (created in the same transaction) ──────────

  @IsOptional()
  @IsArray()
  @ArrayUnique((o: PackageComponentItemDto) => o.serviceId, {
    message: 'Duplicate serviceId values are not allowed',
  })
  @ValidateNested({ each: true })
  @Type(() => PackageComponentItemDto)
  components?: PackageComponentItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageConsultItemDto)
  consults?: PackageConsultItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageExclusionItemDto)
  exclusions?: PackageExclusionItemDto[];
}
