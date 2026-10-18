import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const TUBE_TYPES = [
  'VACUTAINER',
  'STERILE_CUP',
  'SWAB_TUBE',
  'SLIDE_BOX',
] as const;

export class CreateSampleContainerDto {
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

  /** e.g., "Lavender", "Yellow/Gold", "Light Blue", "Grey", "Red", "Green". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  capColor: string;

  /** Hex for UI display, e.g., "#9370DB". */
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{6})$/, {
    message: 'hexColorCode must be like #9370DB',
  })
  hexColorCode?: string;

  /** e.g., "K2 EDTA", "Clot Activator & Gel", "3.2% Sodium Citrate". */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  additive?: string;

  /** Standard draw volume in ml. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultVolumeMl?: number;

  @IsOptional()
  @IsIn(TUBE_TYPES)
  tubeType?: (typeof TUBE_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
