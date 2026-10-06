import { PartialType } from '@nestjs/swagger';
import { CreateDiscountApprovalDto } from './create-discount-approval.dto';

export class UpdateDiscountApprovalDto extends PartialType(
  CreateDiscountApprovalDto,
) {}
