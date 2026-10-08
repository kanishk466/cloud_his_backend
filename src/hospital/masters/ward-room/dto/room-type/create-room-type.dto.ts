import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoomTypeDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  /** true = bypass IPD admission wizard (ER triage beds). */
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  /** true = 24hr-capped stay, daycare package billing. */
  @IsOptional()
  @IsBoolean()
  isDaycare?: boolean;

  /** true = session-based billing, no bed rent. */
  @IsOptional()
  @IsBoolean()
  isDialysis?: boolean;

  /** false = excluded from Bed Occupancy Rate (recovery, stretchers). */
  @IsOptional()
  @IsBoolean()
  isCount?: boolean;

  /** Base per-day bed charge. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultRate?: number;

  /** Per-day nursing charge for this room type. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  nursingCharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
