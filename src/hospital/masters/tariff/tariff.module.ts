import { Module } from '@nestjs/common';
import { TariffController } from './tariff.controller';
import { TariffService } from './tariff.service';
import { PrismaModule } from 'src/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TariffController],
  providers: [TariffService],
  exports: [TariffService],
})
export class TariffModule {}