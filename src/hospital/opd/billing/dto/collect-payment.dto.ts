import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  INSURANCE = 'INSURANCE',
  ONLINE = 'ONLINE',
}

export class CollectPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @IsEnum(PaymentMode)
  @IsNotEmpty()
  paymentMode!: PaymentMode;

  // UPI ref / Card approval code / Insurance claim no
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}