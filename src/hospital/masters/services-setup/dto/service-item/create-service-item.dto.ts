import { Transform, Type } from 'class-transformer';
import {
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
} from 'class-validator';
import { Gender, ServiceItemType } from '@prisma/client';

export class CreateServiceItemDto {
  /** Optional — auto-generated (SVC-0001, SVC-0002, …) when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'serviceCode may contain only letters, digits, underscore and hyphen',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  serviceCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  serviceName: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subCategoryId?: string;

  @IsOptional()
  @IsEnum(ServiceItemType)
  itemType?: ServiceItemType;

  /** GST / tax classification code. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  hsnSacCode?: string;

  /** Unit of measure, e.g. "Per Test", "Per Hour", "Per Session". */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  uom?: string;

  /** Can the billing counter edit the rate for this service? */
  @IsOptional()
  @IsBoolean()
  rateEditable?: boolean;

  /** Is a discount allowed on this service? (false for implants, blood bags…) */
  @IsOptional()
  @IsBoolean()
  discountable?: boolean;

  /** Restrict to a gender, e.g. Pap Smear = FEMALE. */
  @IsOptional()
  @IsEnum(Gender)
  genderRestriction?: Gender;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  minAgeYears?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  maxAgeYears?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
