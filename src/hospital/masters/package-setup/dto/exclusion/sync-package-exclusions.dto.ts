import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { PackageExclusionItemDto } from '../package/create-package.dto';

/** Atomic replace of a package's exclusion list. Empty = none. */
export class SyncPackageExclusionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageExclusionItemDto)
  exclusions!: PackageExclusionItemDto[];
}
