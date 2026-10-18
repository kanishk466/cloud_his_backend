import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export const COMMISSION_STATUSES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'CANCELLED',
] as const;

export class FilterCommissionsDto {
  @IsOptional()
  @IsUUID()
  referDoctorId?: string;

  @IsOptional()
  @IsUUID()
  proUserId?: string;

  @IsOptional()
  @IsIn(COMMISSION_STATUSES)
  status?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
