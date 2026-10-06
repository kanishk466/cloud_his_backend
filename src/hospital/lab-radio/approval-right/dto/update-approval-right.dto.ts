import { PartialType } from '@nestjs/mapped-types';
import { CreateLabApprovalRightDto } from './create-approval-right.dto';

export class UpdateLabApprovalRightDto extends PartialType(CreateLabApprovalRightDto) {}
