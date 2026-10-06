import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorSpecializationDto } from './create-doctor-specialization.dto';

export class UpdateDoctorSpecializationDto extends PartialType(
  CreateDoctorSpecializationDto,
) {}
