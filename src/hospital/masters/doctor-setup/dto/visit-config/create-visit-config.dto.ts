import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateVisitConfigDto {
  @IsUUID()
  @IsNotEmpty()
  doctorProfileId: string;

  /** Omit/null = General (cash) patients; set = panel-specific rule. */
  @IsOptional()
  @IsUUID()
  panelId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  firstVisitFee: number;

  /** Valid follow-up window in days after the previous visit. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  followUpDays?: number;

  /** How many free/discounted follow-up visits are allowed inside the window. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  followUpMaxVisits?: number;

  /** Fee charged per follow-up visit inside the window (typically ₹0). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  followUpFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  emergencyFee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
