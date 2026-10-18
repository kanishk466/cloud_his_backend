import { PartialType } from '@nestjs/mapped-types';
import { CreateClinicalDepartmentDto } from './create-clinical-department.dto';

export class UpdateClinicalDepartmentDto extends PartialType(
  CreateClinicalDepartmentDto,
) {}
