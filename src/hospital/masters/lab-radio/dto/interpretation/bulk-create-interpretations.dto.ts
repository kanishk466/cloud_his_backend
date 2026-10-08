import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
import { CreateInterpretationDto } from './create-interpretation.dto';

export class InterpretationItemDto extends OmitType(CreateInterpretationDto, [
  'observationId',
] as const) {}

/** Replace ALL interpretation rules of an observation atomically. */
export class BulkCreateInterpretationsDto {
  @IsUUID()
  @IsNotEmpty()
  observationId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InterpretationItemDto)
  interpretations!: InterpretationItemDto[];
}
