import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVitalsDto } from './create-vitals.dto';

// All fields optional, patientId cannot be changed
export class UpdateVitalsDto extends PartialType(
  OmitType(CreateVitalsDto, ['patientId'] as const),
) {}