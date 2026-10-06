import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceSubCategoryDto } from './create-service-sub-category.dto';

export class UpdateServiceSubCategoryDto extends PartialType(
  CreateServiceSubCategoryDto,
) {}
