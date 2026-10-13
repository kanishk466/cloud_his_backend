import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const PAYMENT_MODES = [
  'CASH',
  'CARD',
  'UPI',
  'NEFT',
  'CHEQUE',
  'INSURANCE',
  'OTHER',
] as const;

/** `POST /ipd/admissions/:id/payments` — a receipt against the stay. */
export class CreatePaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsIn(PAYMENT_MODES)
  mode?: (typeof PAYMENT_MODES)[number];

  /** UPI/NEFT/cheque reference, receipt no, … */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  receivedAt?: Date;
}
