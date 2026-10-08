import { PartialType } from '@nestjs/mapped-types';
import { CreateReferDoctorDto } from './create-refer-doctor.dto';

export class UpdateReferDoctorDto extends PartialType(CreateReferDoctorDto) {}
