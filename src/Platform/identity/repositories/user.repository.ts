import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  findByEmail(email: string) {
    // PlatformUser table se sirf email ke basis par fetch karein
    // Kyunki roles table ab exist nahi karti
    return this.prisma.platformUser.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.platformUser.findUnique({
      where: { id },
    });
  }
}