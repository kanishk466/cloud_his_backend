import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class UserModuleFeaturePairDto {
  @IsInt()
  moduleId!: number;

  @IsInt()
  featureId!: number;
}

export class SetUserPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UserModuleFeaturePairDto)
  permissions!: UserModuleFeaturePairDto[];
}