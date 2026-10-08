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
import { LabDepartmentType } from '@prisma/client';

export class CreateLabDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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

  @IsEnum(LabDepartmentType)
  departmentType: LabDepartmentType;

  /** Lab in-charge (HospitalUser of this tenant). */
  @IsOptional()
  @IsUUID()
  headUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /** Default turnaround time in hours. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  turnaroundHours?: number;

  @IsOptional()
  @IsBoolean()
  allowTemplates?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
