import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBillDto {
  @IsUUID()
  @IsNotEmpty()
  appointmentId!: string;

  // Registration fee (for new patients)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  registrationFee?: number;

  // Other charges (dressing, minor procedure etc.)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherCharges?: number;

  // Discount
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  discountReason?: string;

  @IsOptional()
  @IsString()
  discountAuthorizedBy?: string;

  // Tax
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent?: number;

  // Insurance
  @IsOptional()
  @IsBoolean()
  isInsurance?: boolean;

  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  insuranceClaimed?: number;
}