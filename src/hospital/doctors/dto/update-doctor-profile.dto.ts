import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorProfileDto } from './create-doctor-profile.dto';

export class UpdateDoctorProfileDto extends PartialType(
  CreateDoctorProfileDto,
) {}