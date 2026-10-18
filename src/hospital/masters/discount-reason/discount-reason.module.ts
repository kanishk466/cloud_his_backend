import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { DiscountReasonController } from './discount-reason.controller';
import { DiscountReasonService } from './discount-reason.service';
import { DiscountReasonRepository } from './discount-reason.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountReasonController],
  providers: [DiscountReasonService, DiscountReasonRepository],
  exports: [DiscountReasonService],
})
export class DiscountReasonModule {}
