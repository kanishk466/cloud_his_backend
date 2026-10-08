import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscountApprovalAuthorityDto } from './create-discount-approval-authority.dto';

export class UpdateDiscountApprovalAuthorityDto extends PartialType(
  CreateDiscountApprovalAuthorityDto,
) {}
