import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';

import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

@Injectable()
export class AuthService {
constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  private readonly userRepository: UserRepository,
  private readonly jwtService: JwtService,
) {}

  async login(email: string, password: string) {
    const user =
      await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const isValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

const tokens = await this.generateTokens(user);

await this.refreshTokenRepository.create({
  userId: user.id,
  token: tokens.refreshToken,
  expiresAt: new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ),
});

return tokens;
  }

private async generateTokens(user: any) {
  const roles = user.roles?.map(
    (userRole) => userRole.role.name,
  ) ?? [];

  const payload = {
    sub: user.id,
    email: user.email,
    roles,
  };

  const accessToken =
    await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: '15m',
    });

  const refreshToken =
    await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '7d',
    });

  return {
    accessToken,
    refreshToken,
  };
}


async refresh(refreshToken: string) {
  const storedToken =
    await this.refreshTokenRepository.findByToken(
      refreshToken,
    );

  if (!storedToken) {
    throw new UnauthorizedException(
      'Invalid refresh token',
    );
  }

  await this.jwtService.verifyAsync(
    refreshToken,
    {
      secret:
        process.env.JWT_REFRESH_SECRET!,
    },
  );

  return this.generateTokens(
    storedToken.user,
  );
}


async logout(refreshToken: string) {
  await this.refreshTokenRepository.delete(
    refreshToken,
  );

  return {
    message: 'Logged out successfully',
  };
}


}