import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RateSchedulesController } from './controllers/rate-schedules.controller';
import { PanelDocumentsController } from './controllers/panel-documents.controller';
import { RateSchedulesService } from './services/rate-schedules.service';
import { RateResolverService } from './services/rate-resolver.service';
import { PanelDocumentsService } from './services/panel-documents.service';
import { RateSchedulesRepository } from './repositories/rate-schedules.repository';
import { PanelDocumentsRepository } from './repositories/panel-documents.repository';

@Module({
  imports: [PrismaModule],
  controllers: [RateSchedulesController, PanelDocumentsController],
  providers: [
    RateSchedulesService,
    RateResolverService,
    PanelDocumentsService,
    RateSchedulesRepository,
    PanelDocumentsRepository,
  ],
  exports: [
    RateSchedulesService,
    RateResolverService, // dynamic tariff resolution → OPD/IPD billing
    PanelDocumentsService,
  ],
})
export class PanelEnhancementsModule {}
