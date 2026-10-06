import { PartialType } from '@nestjs/mapped-types';
import { CreateLabDepartmentDto } from './create-lab-department.dto';

export class UpdateLabDepartmentDto extends PartialType(CreateLabDepartmentDto) {}
