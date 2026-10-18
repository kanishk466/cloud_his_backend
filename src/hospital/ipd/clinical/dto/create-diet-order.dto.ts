import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const DIET_TYPES = [
  'NORMAL',
  'SOFT',
  'LIQUID',
  'SEMI_SOLID',
  'DIABETIC',
  'RENAL',
  'CARDIAC',
  'NPO',
  'TUBE_FEED',
  'OTHER',
] as const;

/** `POST /ipd/diet-orders` — replaces the active diet (one active per stay). */
export class CreateDietOrderDto {
  @IsUUID()
  admissionId: string;

  @IsIn(DIET_TYPES)
  dietType: (typeof DIET_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;
}
