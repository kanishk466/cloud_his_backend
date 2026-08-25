import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthSecurityService } from '../common/auth/auth-security.service';
import { MailModule } from '../Platform/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [AuthSecurityService],
  exports: [PrismaModule, AuthSecurityService],
})
export class SharedModule {}