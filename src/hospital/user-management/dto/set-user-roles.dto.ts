import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class UserRoleAssignmentItemDto {
  @IsInt({ message: 'hospitalRoleId must be an integer' })
  hospitalRoleId!: number;

  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary!: boolean;
}

// A user must always hold at least one role — hence ArrayNotEmpty.
// Exactly one entry must be flagged isPrimary: true (enforced in service).
export class SetUserRolesDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one role must be assigned' })
  @ValidateNested({ each: true })
  @Type(() => UserRoleAssignmentItemDto)
  roles!: UserRoleAssignmentItemDto[];
}
