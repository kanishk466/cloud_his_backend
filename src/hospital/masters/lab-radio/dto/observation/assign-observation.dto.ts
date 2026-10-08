import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ObservationMappingItemDto {
  @IsUUID()
  observationId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  isReportable?: boolean;
}

/** Atomic replace of an investigation's observation set (ordered). */
export class AssignObservationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((o: ObservationMappingItemDto) => o.observationId, {
    message: 'Duplicate observationId values are not allowed',
  })
  @ValidateNested({ each: true })
  @Type(() => ObservationMappingItemDto)
  observations!: ObservationMappingItemDto[];
}
