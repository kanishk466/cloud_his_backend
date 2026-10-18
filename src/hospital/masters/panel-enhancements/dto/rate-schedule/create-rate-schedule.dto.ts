import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRateScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  panelId: string;

  /** The TariffMaster rate list active during this period. */
  @IsUUID()
  @IsNotEmpty()
  tariffId: string;

  /** e.g., "CGHS Rates 2024-2025", "Star Health Revised Q1 2026". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  scheduleName: string;

  @Type(() => Date)
  @IsDate()
  effectiveFrom: Date;

  /** Omit = indefinitely active until the next revision. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  /** Fallback schedule when no date range matches. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
