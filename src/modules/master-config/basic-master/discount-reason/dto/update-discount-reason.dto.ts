import { PartialType } from '@nestjs/swagger';
import { CreateDiscountReasonDto } from './create-discount-reason.dto';

export class UpdateDiscountReasonDto extends PartialType(
  CreateDiscountReasonDto,
) {}
