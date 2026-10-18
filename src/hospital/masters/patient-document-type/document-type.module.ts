import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { DocumentTypeController } from './document-type.controller';
import { DocumentTypeService } from './document-type.service';
import { DocumentTypeRepository } from './document-type.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentTypeController],
  providers: [DocumentTypeService, DocumentTypeRepository],
  exports: [DocumentTypeService],
})
export class DocumentTypeModule {}
