import {
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TokenStatusFilter {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export class QueueFilterDto {
  @IsUUID()
  @IsOptional()
  doctorProfileId?: string;

  @IsOptional()
  @IsDateString()
  date?: string; // Default: today

  @IsOptional()
  @IsEnum(TokenStatusFilter)
  status?: TokenStatusFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}