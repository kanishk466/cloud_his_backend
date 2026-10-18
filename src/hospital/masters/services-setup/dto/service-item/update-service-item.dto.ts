import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceItemDto } from './create-service-item.dto';

export class UpdateServiceItemDto extends PartialType(CreateServiceItemDto) {}
