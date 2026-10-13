import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** `GET /ipd/vitals|rounds|medications|diet-orders` — always admission-scoped. */
export class ClinicalFilterDto {
  @IsUUID()
  admissionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
