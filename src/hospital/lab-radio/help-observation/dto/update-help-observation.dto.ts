import { PartialType } from '@nestjs/mapped-types';
import { CreateHelpObservationDto } from './create-help-observation.dto';

export class UpdateHelpObservationDto extends PartialType(CreateHelpObservationDto) {}
