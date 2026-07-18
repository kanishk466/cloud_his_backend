import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ModuleFeaturePairDto {
  @IsUUID()
  moduleId!: string;

  @IsUUID()
  featureId!: string;
}

export class SetRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ModuleFeaturePairDto)
  moduleFeatures!: ModuleFeaturePairDto[];
}