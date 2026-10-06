import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { LabCommentController } from './lab-comment.controller';
import { LabCommentService } from './lab-comment.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LabCommentController],
  providers: [LabCommentService],
  exports: [LabCommentService],
})
export class LabCommentModule {}
