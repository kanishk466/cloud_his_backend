import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const RESULTS_PER_ENTITY = 5;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    const contains = { contains: q, mode: 'insensitive' as const };

    const [hospitals, packages, users] = await Promise.all([
      this.prisma.hospital.findMany({
        where: { name: contains },
        select: { id: true, name: true, status: true },
        take: RESULTS_PER_ENTITY,
        orderBy: { name: 'asc' },
      }),

      this.prisma.package.findMany({
        where: { name: contains },
        select: { id: true, name: true, monthlyPrice: true },
        take: RESULTS_PER_ENTITY,
        orderBy: { name: 'asc' },
      }),

      // Explicit select — passwordHash never leaves here.
      this.prisma.platformUser.findMany({
        where: {
          OR: [
            { firstName: contains },
            { lastName: contains },
            { email: contains },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
        take: RESULTS_PER_ENTITY,
        orderBy: { email: 'asc' },
      }),
    ]);

    return {
      query: q,
      results: {
        hospitals: hospitals.map((h) => ({
          id: h.id,
          name: h.name,
          isActive: h.status === 'ACTIVE',
        })),
        packages,
        users: users.map((u) => ({
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' '),
          email: u.email,
          role: u.role,
        })),
      },
    };
  }
}
