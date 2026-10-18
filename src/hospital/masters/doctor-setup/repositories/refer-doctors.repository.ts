import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateReferDoctorDto } from '../dto/refer-doctor/create-refer-doctor.dto';
import { UpdateReferDoctorDto } from '../dto/refer-doctor/update-refer-doctor.dto';
import { FilterReferDoctorDto } from '../dto/refer-doctor/filter-refer-doctor.dto';

const PRO_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    mobile: true,
  },
} as const;

@Injectable()
export class ReferDoctorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Code generation (REF-0001, REF-0002, …) ────────────────────────────────

  async generateCode(tenantId: string): Promise<string> {
    const existing = await this.prisma.referDoctor.findMany({
      where: { tenantId, code: { startsWith: 'REF-' } },
      select: { code: true },
    });

    let max = 0;
    for (const { code } of existing) {
      const num = parseInt((code ?? '').replace('REF-', ''), 10);
      if (!Number.isNaN(num) && num > max) max = num;
    }
    return `REF-${String(max + 1).padStart(4, '0')}`;
  }

  create(tenantId: string, data: CreateReferDoctorDto & { code: string }) {
    return this.prisma.referDoctor.create({
      data: { ...data, tenantId },
      include: { proUser: PRO_SELECT },
    });
  }

  findAll(tenantId: string, filters: FilterReferDoctorDto) {
    return this.prisma.referDoctor.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.proUserId ? { proUserId: filters.proUserId } : {}),
        ...(filters.city
          ? { city: { equals: filters.city, mode: 'insensitive' as const } }
          : {}),
        ...(filters.specialization
          ? {
              specialization: {
                contains: filters.specialization,
                mode: 'insensitive' as const,
              },
            }
          : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  name: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  code: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
                { mobile: { contains: filters.search } },
                {
                  clinicHospitalName: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: { proUser: PRO_SELECT },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.referDoctor.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { proUser: PRO_SELECT },
    });
  }

  update(tenantId: string, id: string, dto: UpdateReferDoctorDto) {
    return this.prisma.referDoctor.update({
      where: { id, tenantId },
      data: dto,
      include: { proUser: PRO_SELECT },
    });
  }

  assignPro(tenantId: string, id: string, proUserId: string | null) {
    return this.prisma.referDoctor.update({
      where: { id, tenantId },
      data: { proUserId },
      include: { proUser: PRO_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.referDoctor.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── PRO validation helper ──────────────────────────────────────────────────

  findProUser(tenantId: string, proUserId: string) {
    return this.prisma.hospitalUser.findFirst({
      where: {
        id: proUserId,
        tenantId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }
}
