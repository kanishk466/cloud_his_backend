import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateVisitConfigDto } from '../dto/visit-config/create-visit-config.dto';
import { UpdateVisitConfigDto } from '../dto/visit-config/update-visit-config.dto';

const RELATION_SELECT = {
  doctorProfile: {
    select: {
      id: true,
      hospitalUser: { select: { firstName: true, lastName: true } },
    },
  },
  panel: { select: { id: true, panelName: true, panelCode: true } },
} as const;

@Injectable()
export class DoctorVisitConfigsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** panelId is nullable — Prisma composite-unique lookup can't match NULLs,
   *  so general-config lookup uses findFirst with panelId: null. */
  findByDoctorAndPanel(
    tenantId: string,
    doctorProfileId: string,
    panelId?: string,
  ) {
    return this.prisma.doctorOpdVisitConfig.findFirst({
      where: {
        tenantId,
        doctorProfileId,
        panelId: panelId ?? null,
        deletedAt: null,
      },
      include: RELATION_SELECT,
    });
  }

  create(tenantId: string, dto: CreateVisitConfigDto) {
    return this.prisma.doctorOpdVisitConfig.create({
      data: { ...dto, panelId: dto.panelId ?? null, tenantId },
      include: RELATION_SELECT,
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.doctorOpdVisitConfig.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: RELATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** All configs (general + every panel) for one doctor. */
  findForDoctor(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorOpdVisitConfig.findMany({
      where: { tenantId, doctorProfileId, deletedAt: null },
      include: RELATION_SELECT,
      orderBy: [{ panelId: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.doctorOpdVisitConfig.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RELATION_SELECT,
    });
  }

  update(tenantId: string, id: string, dto: UpdateVisitConfigDto) {
    return this.prisma.doctorOpdVisitConfig.update({
      where: { id, tenantId },
      data: dto,
      include: RELATION_SELECT,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.doctorOpdVisitConfig.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Lookup helpers for validation / fee resolution ────────────────────────

  findDoctorProfile(tenantId: string, doctorProfileId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id: doctorProfileId, tenantId },
      select: { id: true, consultationFee: true, isActive: true },
    });
  }

  findPanel(tenantId: string, panelId: string) {
    return this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null },
      select: { id: true, panelName: true },
    });
  }
}
