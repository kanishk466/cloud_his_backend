import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt } from 'class-validator';

// Empty array is allowed — clears all department mappings for the user.
export class SetUserDepartmentsDto {
  @IsArray()
  @ArrayUnique({ message: 'departmentIds must not contain duplicates' })
  @IsInt({ each: true, message: 'Each departmentId must be an integer' })
  @Type(() => Number)
  departmentIds!: number[];
}
