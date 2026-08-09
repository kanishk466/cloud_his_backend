import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateDoctorProfileDto } from './create-doctor-profile.dto';

// All optional, hospitalUserId cannot change
export class UpdateDoctorProfileDto extends PartialType(
  OmitType(CreateDoctorProfileDto, ['hospitalUserId'] as const),
) {}