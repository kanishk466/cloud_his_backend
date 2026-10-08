import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateThresholdDto {
  @IsUUID()
  @IsNotEmpty()
  panelId: string;

  /** Omit for a general panel limit (applies to ALL room types). */
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  /** Maximum allowed running bill for this panel (₹). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAmount: number;

  /** Usage % at which ALERT status starts (default 80). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  alertAtPercent?: number;

  /** SOFT = warning on breach; HARD = block charges on breach. */
  @IsOptional()
  @IsIn(['SOFT', 'HARD'])
  actionOnBreach?: 'SOFT' | 'HARD';
}
