import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** Atomic replace of a room's amenity set. Empty array clears all. */
export class AssignAmenityDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  amenityIds!: string[];
}
