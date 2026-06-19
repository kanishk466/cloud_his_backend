import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';

import { AuthService } from './services/auth.service';

import { UserRepository } from './repositories/user.repository';

import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_ACCESS_SECRET,

      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    UserRepository,
    JwtStrategy,
    RefreshTokenRepository,
  ],

  exports: [AuthService],
})
export class IdentityModule {}