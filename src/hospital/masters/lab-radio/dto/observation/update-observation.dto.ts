import { PartialType } from '@nestjs/mapped-types';
import { CreateObservationDto } from './create-observation.dto';

export class UpdateObservationDto extends PartialType(CreateObservationDto) {}
