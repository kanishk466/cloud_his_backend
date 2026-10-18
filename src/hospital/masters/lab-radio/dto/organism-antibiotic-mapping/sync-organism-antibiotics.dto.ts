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

export class OrganismAntibioticItemDto {
  @IsUUID()
  antibioticId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** true = first-line test drug; false = reserve/second-line. */
  @IsOptional()
  @IsBoolean()
  isFirstLine?: boolean;
}

/** Atomic replace of an organism's standard AST testing panel. */
export class SyncOrganismAntibioticsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((o: OrganismAntibioticItemDto) => o.antibioticId, {
    message: 'Duplicate antibioticId values are not allowed',
  })
  @ValidateNested({ each: true })
  @Type(() => OrganismAntibioticItemDto)
  panel!: OrganismAntibioticItemDto[];
}
