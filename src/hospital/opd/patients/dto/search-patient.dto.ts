import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PatientStatus } from './patient-response.dto';
import { PAGINATION } from '../constants/patients.constants';

export class SearchPatientDto {
  // Free text search: name / UHID / mobile
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  // Exact mobile search
  @IsOptional()
  @IsString()
  mobile?: string;

  // Exact UHID search
  @IsOptional()
  @IsString()
  uhid?: string;

  // Exact Aadhaar search
  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PAGINATION.DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit?: number = PAGINATION.DEFAULT_LIMIT;
}