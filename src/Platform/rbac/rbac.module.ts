import { Module } from '@nestjs/common';
import { RbacController } from './controllers/rbac.controller';
import { RbacService } from './services/rbac.service';

@Module({
  controllers: [RbacController],
  providers: [RbacService]
})
export class RbacModule {}
