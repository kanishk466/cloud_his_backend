import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export const ADMISSION_STATUSES = [
  'ADMITTED',
  'DISCHARGE_ORDERED',
  'DISCHARGED',
  'CANCELLED',
] as const;

export class FilterAdmissionDto {
  @IsOptional()
  @IsIn(ADMISSION_STATUSES)
  status?: (typeof ADMISSION_STATUSES)[number];

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @IsOptional()
  @IsUUID()
  panelId?: string;

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
