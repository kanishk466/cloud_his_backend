import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePackageDto } from './create-package.dto';

// code identity + nested structure can't change here — use the sync endpoints.
export class UpdatePackageDto extends PartialType(
  OmitType(CreatePackageDto, [
    'code',
    'components',
    'consults',
    'exclusions',
  ] as const),
) {
  isActive?: boolean;
}
