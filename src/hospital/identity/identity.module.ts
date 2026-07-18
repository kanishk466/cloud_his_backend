import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from '../../shared/prisma/prisma.service';

import { HospitalAuthController } from './controllers/hospital-auth.controller';
import { HospitalAuthService } from './services/hospital-auth.service';

import { HospitalAuthUserRepository } from './repositories/hospital-auth-user.repository/hospital-auth-user.repository';
import { HospitalLookupRepository } from './repositories/hospital-lookup.repository/hospital-lookup.repository';

import { HospitalJwtStrategy } from './strategies/hospital-jwt.strategy';

@Module({
  imports: [
    JwtModule.register({}), // we use jwtService.signAsync with secrets from env
  ],
  controllers: [HospitalAuthController],
  providers: [
    PrismaService,
    HospitalAuthService,
    HospitalAuthUserRepository,
    HospitalLookupRepository,
    HospitalJwtStrategy,
  ],
  exports: [HospitalAuthService],
})
export class HospitalIdentityModule {}