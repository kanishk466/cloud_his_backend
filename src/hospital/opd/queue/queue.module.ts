import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueRepository } from './queue.repository';

@Module({
  controllers: [QueueController],
  providers: [QueueService, QueueRepository],
  exports: [QueueService], // Used in Consultation module (Step 5)
})
export class QueueModule {}