import { PartialType } from '@nestjs/mapped-types';
import { CreateProMappingDto } from './create-pro-mapping.dto';

export class UpdateProMappingDto extends PartialType(CreateProMappingDto) {}
