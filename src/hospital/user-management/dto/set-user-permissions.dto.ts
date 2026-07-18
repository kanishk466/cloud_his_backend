import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class UserModuleFeaturePairDto {
  @IsUUID()
  moduleId!: string;

  @IsUUID()
  featureId!: string;
}

export class SetUserPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UserModuleFeaturePairDto)
  permissions!: UserModuleFeaturePairDto[];
}