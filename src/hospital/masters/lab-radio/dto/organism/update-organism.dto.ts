import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganismDto } from './create-organism.dto';

export class UpdateOrganismDto extends PartialType(CreateOrganismDto) {}
