import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class RecordConsumptionDto {
  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  /** Service consumed (test/procedure) — XOR with doctorProfileId. */
  @ValidateIf((o) => !o.doctorProfileId)
  @IsUUID()
  @IsNotEmpty({ message: 'Provide serviceId or doctorProfileId' })
  serviceId?: string;

  /** Doctor consulted — XOR with serviceId. */
  @ValidateIf((o) => !o.serviceId)
  @IsUUID()
  @IsNotEmpty({ message: 'Provide doctorProfileId or serviceId' })
  doctorProfileId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  consumedQuantity?: number;

  /** true = over-consumption, billed at standard tariff rate. */
  @IsOptional()
  @IsBoolean()
  isExtraBilled?: boolean;

  /** Link to OpdBill / IpdBill. */
  @IsOptional()
  @IsUUID()
  billId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
