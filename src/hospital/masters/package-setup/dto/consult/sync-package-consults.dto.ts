import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { PackageConsultItemDto } from '../package/create-package.dto';

/** Atomic replace of a package's doctor consult allowances. Empty = none. */
export class SyncPackageConsultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageConsultItemDto)
  consults!: PackageConsultItemDto[];
}
