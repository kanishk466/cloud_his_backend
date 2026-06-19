import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.platformUser.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.platformUser.findUnique({
      where: { id },
    });
  }
}