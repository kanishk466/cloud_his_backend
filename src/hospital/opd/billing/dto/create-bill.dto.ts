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
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBillItemDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class CreateBillDto {
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'A bill must contain at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items!: CreateBillItemDto[];

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

  // ─── OPTIONAL: Pay at time of bill creation ─────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paymentAmount?: number;

  @IsOptional()
  @IsIn(['CASH', 'CARD', 'UPI', 'INSURANCE', 'ONLINE', 'MIXED'])
  paymentMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTransactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentNotes?: string;
}