import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceItemTypeDto } from './create-service-item-type.dto';

export class UpdateServiceItemTypeDto extends PartialType(
  CreateServiceItemTypeDto,
) {}
