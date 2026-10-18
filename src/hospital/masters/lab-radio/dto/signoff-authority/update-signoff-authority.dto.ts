import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSignoffAuthorityDto } from './create-signoff-authority.dto';

export class UpdateSignoffAuthorityDto extends PartialType(
  OmitType(CreateSignoffAuthorityDto, ['hospitalUserId'] as const),
) {}
