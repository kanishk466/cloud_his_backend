import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

/** Query DTO for the follow-up fee helper (GET .../calculate). */
export class CalculateVisitFeeDto {
  @IsUUID()
  @IsNotEmpty()
  doctorProfileId: string;

  /** Panel of the visiting patient; omit for General/Cash. */
  @IsOptional()
  @IsUUID()
  panelId?: string;

  /** Date of the patient's last visit with this doctor (ISO date). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastVisitDate?: Date;

  /** Follow-up visits already consumed in the current window (default 0). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  visitCount?: number;
}
