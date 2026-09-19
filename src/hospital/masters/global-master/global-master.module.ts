import { Module } from '@nestjs/common';
import { GlobalMasterController } from './global-master.controller';
import { GlobalMasterService } from './global-master.service';
// import { GlobalMasterSeeder } from './seeders/global-master.seeder';
import { PrismaModule } from 'src/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GlobalMasterController],
  providers: [GlobalMasterService],
  exports: [GlobalMasterService],
})
export class GlobalMasterModule {}