import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SpecimenType } from '@prisma/client';

export class FilterInvestigationDto {
  @IsOptional()
  @IsUUID()
  labDepartmentId?: string;

  @IsOptional()
  @IsEnum(SpecimenType)
  specimenType?: SpecimenType;

  /** Matches name / code / shortName (case-insensitive). */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : undefined,
  )
  isActive?: boolean;
}
