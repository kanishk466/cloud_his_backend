import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { BankRepository } from './bank.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BankController],
  providers: [BankService, BankRepository],
  exports: [BankService],
})
export class BankModule {}
