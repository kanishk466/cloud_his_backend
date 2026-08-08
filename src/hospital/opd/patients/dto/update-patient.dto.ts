import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

// All fields optional for update
// Mobile cannot be updated (it's a unique identifier)
export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['mobile'] as const),
) {}