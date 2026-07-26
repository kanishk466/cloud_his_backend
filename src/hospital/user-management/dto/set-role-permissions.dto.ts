import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class ModuleFeaturePairDto {
  @IsInt()
  moduleId!: number;

  @IsInt()
  featureId!: number;
}

export class SetRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ModuleFeaturePairDto)
  moduleFeatures!: ModuleFeaturePairDto[];
}