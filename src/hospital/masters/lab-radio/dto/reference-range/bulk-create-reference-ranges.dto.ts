import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
import { CreateReferenceRangeDto } from './create-reference-range.dto';

export class ReferenceRangeItemDto extends OmitType(CreateReferenceRangeDto, [
  'observationId',
] as const) {}

/** Replace ALL ranges of an observation atomically. */
export class BulkCreateReferenceRangesDto {
  @IsUUID()
  @IsNotEmpty()
  observationId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReferenceRangeItemDto)
  ranges!: ReferenceRangeItemDto[];
}
