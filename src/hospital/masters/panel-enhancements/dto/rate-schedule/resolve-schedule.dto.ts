import { Type } from 'class-transformer';
import { IsDate, IsIn, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/** Query DTO for the tariff resolution helper. */
export class ResolveScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  panelId: string;

  /** Billing date to resolve against; defaults to now. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDate?: Date;

  /** Which panel fallback tariff to prefer when no schedule matches. */
  @IsOptional()
  @IsIn(['OPD', 'IPD'])
  context?: 'OPD' | 'IPD';
}
