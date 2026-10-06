import { PartialType } from '@nestjs/mapped-types';
import { CreateBedAmenityDto } from './create-bed-amenity.dto';

export class UpdateBedAmenityDto extends PartialType(CreateBedAmenityDto) {}
