import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export const CHARGE_CATEGORIES = [
  'ROOM',
  'NURSING',
  'SERVICE',
  'PROCEDURE',
  'PHARMACY',
  'LAB',
  'OTHER',
] as const;

/** `POST /ipd/billing/charges` — one running-bill line (amount is server-computed). */
export class CreateChargeDto {
  @IsUUID()
  admissionId: string;

  @IsOptional()
  @IsIn(CHARGE_CATEGORIES)
  category?: (typeof CHARGE_CATEGORIES)[number];

  @IsString()
  @MaxLength(300)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  /** Defaults to today; back-dating is allowed for late entries. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  chargeDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** `GET /ipd/billing/charges?admissionId=…&limit=…`. */
export class FilterChargesDto {
  @IsUUID()
  admissionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
