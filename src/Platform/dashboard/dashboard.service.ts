import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const MONTHS_IN_WINDOW = 6;
const SNAPSHOT_SIZE = 5;
const RECENT_ACTIVITY_SIZE = 5;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    try {
      const [
        totalHospitals,
        activeHospitals,
        activeAssignments,
        recentHospitals,
        recentActivity,
      ] = await Promise.all([
        this.prisma.hospital.count(),
        this.prisma.hospital.count({ where: { status: 'ACTIVE' } }),
        this.prisma.assignedPackage.findMany({
          where: { status: 'ACTIVE', hospital: { status: 'ACTIVE' } },
          select: {
            startDate: true,
            package: { select: { monthlyPrice: true } },
          },
        }),
        this.prisma.hospital.findMany({
          take: SNAPSHOT_SIZE,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            status: true,
            packages: {
              where: { status: 'ACTIVE' },
              orderBy: { startDate: 'desc' },
              take: 1,
              select: { package: { select: { name: true } } },
            },
          },
        }),
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: RECENT_ACTIVITY_SIZE,
        }),
      ]);

      const totalRevenue = activeAssignments.reduce(
        (sum, assignment) => sum + assignment.package.monthlyPrice,
        0,
      );

      const now = new Date();
      const buckets = new Map<string, number>();
      for (let i = MONTHS_IN_WINDOW - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.set(monthKey(d), 0);
      }

      for (const assignment of activeAssignments) {
        const key = monthKey(assignment.startDate);
        if (buckets.has(key)) {
          buckets.set(key, buckets.get(key)! + assignment.package.monthlyPrice);
        }
      }

      const revenueByMonth = Array.from(buckets, ([month, revenue]) => ({
        month,
        revenue,
      }));

      const hospitalHealthSnapshot = recentHospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.name,
        isActive: hospital.status === 'ACTIVE',
        packageName: hospital.packages[0]?.package.name ?? null,
      }));

      return {
        totalHospitals,
        activeHospitals,
        totalRevenue,
        revenueByMonth,
        hospitalHealthSnapshot,
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Dashboard getStats failed', error);
      throw error;
    }
  }
}