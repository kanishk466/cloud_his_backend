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

  /** Phase 2.1B — link to ServiceMaster. When present, the line is
   *  validated against service rules (gender/age/rate/discount) and the
   *  unit rate is resolved server-side (panel tariff → doctor fee → base). */
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  /** Spec shape — alias of `description` (legacy). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  serviceName?: string;

  /** Legacy shape — free-text description. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** Legacy shape. Derivable from the service master when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  /** Spec shape — alias of `unitPrice`. Ignored for rate-locked services
   *  when the server-resolved rate differs (rate hierarchy wins). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitRate?: number;

  /** Legacy shape. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  /** Optional line-level discount % (bill-level discountPercent applies otherwise). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  /** Spec shape — absolute line discount. Wins over discountPercent. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  /** Spec shape — client-computed line total. Server recomputes and wins
   *  when it differs (defence against tampered payloads). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount?: number;

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

  /** Panel billing — auto-filled from the patient when omitted. */
  @IsOptional()
  @IsUUID()
  panelId?: string;

  /** Spec V2 — consulting doctor. Falls back to the appointment's doctor. */
  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  /** Spec V2 — visit number, e.g. APT-20261018-0001. Falls back to appointmentNo. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visitNo?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'A bill must contain at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items!: CreateBillItemDto[];

  // ─── SPEC V2: AMOUNTS (informational; server recomputes and wins) ──────
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netAmount?: number;

  // ─── SPEC V2: CO-PAY & PANEL SPLIT ─────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  coPayPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  coPayAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  patientPayable?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  panelPayable?: number;

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

  /** Spec V2 — alias of `discountAuthorizedBy` (UUID of the authorizing user). */
  @IsOptional()
  @IsUUID()
  discountAuthorityId?: string;

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

  /** Spec V2 — cash-tendered amount. changeAmount = paidAmount − netAmount. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  changeAmount?: number;

  @IsOptional()
  @IsIn(['CASH', 'CARD', 'UPI', 'CREDIT', 'INSURANCE', 'ONLINE', 'MIXED'])
  paymentMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTransactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
