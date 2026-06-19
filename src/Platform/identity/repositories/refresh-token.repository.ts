import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({
      data,
    });
  }

  findByToken(token: string) {
    return this.prisma.refreshToken.findFirst({
      where: { token },
      include: {
        user: true,
      },
    });
  }

  delete(token: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }
}