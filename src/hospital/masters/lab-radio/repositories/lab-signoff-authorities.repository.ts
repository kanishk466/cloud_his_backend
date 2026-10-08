import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateSignoffAuthorityDto } from '../dto/signoff-authority/create-signoff-authority.dto';
import { UpdateSignoffAuthorityDto } from '../dto/signoff-authority/update-signoff-authority.dto';

const RELATION_SELECT = {
  hospitalUser: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  labDepartment: { select: { id: true, name: true, code: true } },
} as const;

@Injectable()
export class LabSignoffAuthoritiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateSignoffAuthorityDto) {
    return this.prisma.labSignoffAuthority.create({
      data: { ...dto, labDepartmentId: dto.labDepartmentId ?? null, tenantId },
      include: RELATION_SELECT,
    });
  }

  findAll(
    tenantId: string,
    filters: {
      labDepartmentId?: string;
      hospitalUserId?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.labSignoffAuthority.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.labDepartmentId
          ? { labDepartmentId: filters.labDepartmentId }
          : {}),
        ...(filters.hospitalUserId
          ? { hospitalUserId: filters.hospitalUserId }
          : {}),
      },
      include: RELATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.labSignoffAuthority.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RELATION_SELECT,
    });
  }

  /** Dept-specific authority first, then the user's global (null-dept) row. */
  findForPermission(
    tenantId: string,
    hospitalUserId: string,
    labDepartmentId: string,
  ) {
    return this.prisma.labSignoffAuthority.findFirst({
      where: {
        tenantId,
        hospitalUserId,
        isActive: true,
        deletedAt: null,
        OR: [{ labDepartmentId }, { labDepartmentId: null }],
      },
      orderBy: { labDepartmentId: 'desc' }, // dept-specific (non-null) first
      include: RELATION_SELECT,
    });
  }

  /** NULL-dept duplicates can't be caught by the unique index — service checks first. */
  findExact(
    tenantId: string,
    hospitalUserId: string,
    labDepartmentId: string | null,
  ) {
    return this.prisma.labSignoffAuthority.findFirst({
      where: {
        tenantId,
        hospitalUserId,
        labDepartmentId: labDepartmentId ?? null,
        deletedAt: null,
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateSignoffAuthorityDto) {
    return this.prisma.labSignoffAuthority.update({
      where: { id, tenantId },
      data: dto,
      include: RELATION_SELECT,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.labSignoffAuthority.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Validation helpers ─────────────────────────────────────────────────────

  findUser(tenantId: string, hospitalUserId: string) {
    return this.prisma.hospitalUser.findFirst({
      where: {
        id: hospitalUserId,
        tenantId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  findLabDepartment(tenantId: string, labDepartmentId: string) {
    return this.prisma.labDepartment.findFirst({
      where: { id: labDepartmentId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }
}
