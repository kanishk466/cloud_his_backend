import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const MS_PER_DAY = 86400000;
const EXPIRY_WINDOW_DAYS = 30;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications() {
    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + EXPIRY_WINDOW_DAYS * MS_PER_DAY,
    );

    const [pendingActivations, expiring] = await Promise.all([
      this.prisma.hospital.findMany({
        where: {
          status: 'DRAFT',
          packages: { some: {} },
        },
        select: { id: true, name: true, code: true, createdAt: true },
      }),
      this.prisma.assignedPackage.findMany({
        where: {
          endDate: { gte: now, lte: windowEnd },
          status: 'ACTIVE',
        },
        include: {
          hospital: { select: { id: true, name: true } },
        },
      }),
    ]);

    const expiringPackages = expiring.map((assignment) => ({
      hospitalId: assignment.hospital.id,
      hospitalName: assignment.hospital.name,
      endDate: assignment.endDate,
      daysLeft: Math.ceil(
        ((assignment.endDate as Date).getTime() - now.getTime()) / MS_PER_DAY,
      ),
    }));

    return { pendingActivations, expiringPackages };
  }
}
