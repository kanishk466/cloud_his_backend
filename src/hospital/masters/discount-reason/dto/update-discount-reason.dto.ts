import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscountReasonDto } from './create-discount-reason.dto';

// `code` keeps the upper-casing transform inherited from the create DTO.
export class UpdateDiscountReasonDto extends PartialType(
  CreateDiscountReasonDto,
) {}
