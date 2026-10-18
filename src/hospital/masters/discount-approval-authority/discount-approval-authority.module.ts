import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { DiscountApprovalAuthorityController } from './discount-approval-authority.controller';
import { DiscountApprovalAuthorityService } from './discount-approval-authority.service';
import { DiscountApprovalAuthorityRepository } from './discount-approval-authority.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountApprovalAuthorityController],
  providers: [
    DiscountApprovalAuthorityService,
    DiscountApprovalAuthorityRepository,
  ],
  exports: [DiscountApprovalAuthorityService],
})
export class DiscountApprovalAuthorityModule {}
