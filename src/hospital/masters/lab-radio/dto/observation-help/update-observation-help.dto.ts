import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateObservationHelpDto } from './create-observation-help.dto';

export class UpdateObservationHelpDto extends PartialType(
  OmitType(CreateObservationHelpDto, ['observationId'] as const),
) {}
