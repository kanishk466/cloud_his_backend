import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PackageComponentItemDto } from '../package/create-package.dto';

/** Atomic replace of a package's included components. */
export class SyncPackageComponentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((o: PackageComponentItemDto) => o.serviceId, {
    message: 'Duplicate serviceId values are not allowed',
  })
  @ValidateNested({ each: true })
  @Type(() => PackageComponentItemDto)
  components!: PackageComponentItemDto[];
}
