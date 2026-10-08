import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const DISCHARGE_TYPES = [
  'NORMAL',
  'LAMA',
  'TRANSFERRED',
  'EXPIRED',
] as const;

export class InitiateDischargeDto {
  @IsIn(DISCHARGE_TYPES)
  @IsNotEmpty()
  dischargeType!: (typeof DISCHARGE_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  dischargeSummary?: string;
}
