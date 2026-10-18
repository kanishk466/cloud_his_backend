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
  MaxLength,
  Min,
} from 'class-validator';
import { StorageTemperature } from '@prisma/client';

export class CreateSampleTypeDto {
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

  /** Preferred default tube for this specimen. */
  @IsOptional()
  @IsUUID()
  defaultContainerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minVolumeMl?: number;

  @IsOptional()
  @IsEnum(StorageTemperature)
  storageTemp?: StorageTemperature;

  /** Stability at 20-25°C (hours). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stabilityRoomTempHours?: number;

  /** Stability at 2-8°C (hours). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stabilityFridgeHours?: number;

  /** Stability at -20°C (days). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stabilityFrozenDays?: number;

  /** Post-reporting retention days for re-testing (NABL compliance). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  archiveDays?: number;

  /** e.g., "Early morning mid-stream catch", "Overnight fast". */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  collectionInstructions?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
