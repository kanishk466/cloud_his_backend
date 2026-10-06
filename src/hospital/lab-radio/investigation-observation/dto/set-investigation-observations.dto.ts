import { IsArray, IsOptional, IsUUID, ValidateNested, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvestigationObservationItemDto {
  @ApiProperty({ description: 'Observation id' })
  @IsUUID()
  observationId: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class SetInvestigationObservationsDto {
  @ApiProperty({ type: [InvestigationObservationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvestigationObservationItemDto)
  observations: InvestigationObservationItemDto[];
}
