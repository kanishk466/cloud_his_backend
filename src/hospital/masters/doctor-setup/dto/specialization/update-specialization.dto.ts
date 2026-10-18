import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecializationDto } from './create-specialization.dto';

export class UpdateSpecializationDto extends PartialType(
  CreateSpecializationDto,
) {}
