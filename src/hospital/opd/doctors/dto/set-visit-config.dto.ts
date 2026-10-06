import { IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetVisitConfigDto {
  @ApiPropertyOptional({ example: 7, description: 'Free follow-up window in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeFollowupDays?: number;

  @ApiPropertyOptional({ example: 2, description: 'Max free visits within the window' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFreeVisits?: number;

  @ApiPropertyOptional({ example: 50, description: 'Revisit charge as % of consultation fee' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  revisitChargePercent?: number;

  @ApiPropertyOptional({ example: 30, description: 'Prescription validity in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  validityAfterPrescription?: number | null;
}
