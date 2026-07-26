import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformUser, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActor } from '../audit/audit-actor';
import { ListPlatformUsersDto } from './dto/list-platform-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Explicit field selection — passwordHash must never leave the service layer.
 */
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.PlatformUserSelect;

type PublicUserRow = Prisma.PlatformUserGetPayload<{
  select: typeof PUBLIC_USER_SELECT;
}>;

function toPublicUser(user: PublicUserRow) {
  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    email: user.email,
    role: user.role,
    isActive: user.status === 'ACTIVE',
    createdAt: user.createdAt,
  };
}

@Injectable()
export class PlatformUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: ListPlatformUsersDto) {
    const users = await this.prisma.platformUser.findMany({
      where: query.role ? { role: query.role } : {},
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(toPublicUser);
  }

  private async findOrThrow(id: string): Promise<PlatformUser> {
    const user = await this.prisma.platformUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Platform user not found');
    }
    return user;
  }

  async disable(id: string) {
    const user = await this.findOrThrow(id);

    if (user.status === 'INACTIVE') {
      throw new ConflictException('User is already disabled');
    }

    const updated = await this.prisma.platformUser.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: PUBLIC_USER_SELECT,
    });

    return toPublicUser(updated);
  }

  async enable(id: string) {
    const user = await this.findOrThrow(id);

    if (user.status === 'ACTIVE') {
      throw new ConflictException('User is already active');
    }

    const updated = await this.prisma.platformUser.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: PUBLIC_USER_SELECT,
    });

    return toPublicUser(updated);
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actor?: AuditActor) {
    const user = await this.findOrThrow(id);

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.platformUser.update({
      where: { id },
      data: { passwordHash },
    });

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'USER_PASSWORD_RESET',
        targetType: 'PlatformUser',
        targetName: user.email,
        detail: `Password reset for ${user.email}`,
      });
    }

    return { message: 'Password reset successfully' };
  }
}
