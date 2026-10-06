import { Module } from '@nestjs/common';
import { BasicMasterModule } from './basic-master/basic-master.module';

/**
 * Master Configuration aggregator.
 * Houses all master-data domains (Basic Master, and future groups).
 */
@Module({
  imports: [BasicMasterModule],
  exports: [BasicMasterModule],
})
export class MasterConfigModule {}
