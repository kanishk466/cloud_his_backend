import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/**
 * SECURITY: refresh tokens are stored as sha256 digests, never plaintext.
 * A database leak alone can no longer mint valid refresh calls, and direct
 * lookup by digest keeps the hot path O(1) (bcrypt would force full scans).
 *
 * NOTE: on first deploy, previously-stored plaintext/other-format rows will
 * simply stop matching (harmless — users re-login); consider clearing the
 * table during the release.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
      data: {
        userId: data.userId,
        token: hashToken(data.token),
        expiresAt: data.expiresAt,
      },
    });
  }

  findByToken(token: string) {
    return this.prisma.refreshToken.findFirst({
      where: { token: hashToken(token) },
      include: {
        user: true,
      },
    });
  }

  delete(token: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { token: hashToken(token) },
    });
  }

  /** Reuse-detection response: revoke every session of the user. */
  revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
