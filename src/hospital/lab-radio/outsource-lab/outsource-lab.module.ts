import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/prisma/prisma.module';
import { AuditModule } from 'src/Platform/audit/audit.module';
import { OutsourceLabController } from './outsource-lab.controller';
import { OutsourceLabService } from './outsource-lab.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [OutsourceLabController],
  providers: [OutsourceLabService],
  exports: [OutsourceLabService],
})
export class OutsourceLabModule {}
