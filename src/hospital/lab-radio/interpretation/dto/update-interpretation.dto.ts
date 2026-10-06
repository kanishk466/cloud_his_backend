import { PartialType } from '@nestjs/mapped-types';
import { CreateInterpretationDto } from './create-interpretation.dto';

export class UpdateInterpretationDto extends PartialType(CreateInterpretationDto) {}
