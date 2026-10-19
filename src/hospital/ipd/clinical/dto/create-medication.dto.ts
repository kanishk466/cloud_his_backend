import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const MEDICATION_ROUTES = [
  'ORAL',
  'IV',
  'IM',
  'SC',
  'TOPICAL',
  'INHALATION',
  'OTHER',
] as const;

export const MEDICATION_FREQUENCIES = [
  'OD',
  'BD',
  'TDS',
  'QID',
  'HS',
  'SOS',
  'STAT',
  'WEEKLY',
] as const;

/** `POST /ipd/medications` — one drug-chart line for the stay. */
export class CreateMedicationDto {
  @IsUUID()
  admissionId: string;

  @IsString()
  @MaxLength(200)
  drugName: string;

  /** Free text as prescribed: "500 mg", "2 puffs", "10 ml". */
  @IsString()
  @MaxLength(100)
  dose: string;

  @IsOptional()
  @IsIn(MEDICATION_ROUTES)
  route?: (typeof MEDICATION_ROUTES)[number];

  @IsOptional()
  @IsIn(MEDICATION_FREQUENCIES)
  frequency?: (typeof MEDICATION_FREQUENCIES)[number];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  /** Optional planned stop; stopping early uses POST /medications/:id/stop. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** `POST /ipd/medications/:id/stop`. */
export class StopMedicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
