import { PartialType } from '@nestjs/mapped-types';
import { CreateBedDto } from './create-bed.dto';

export class UpdateBedDto extends PartialType(CreateBedDto) {}
