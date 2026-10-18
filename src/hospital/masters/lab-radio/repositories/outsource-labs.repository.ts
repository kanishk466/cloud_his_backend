import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateOutsourceLabDto } from '../dto/outsource-lab/create-outsource-lab.dto';
import { UpdateOutsourceLabDto } from '../dto/outsource-lab/update-outsource-lab.dto';

@Injectable()
export class OutsourceLabsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateOutsourceLabDto) {
    return this.prisma.outsourceLabMaster.create({
      data: { ...dto, tenantId },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.outsourceLabMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        _count: { select: { investigations: { where: { deletedAt: null } } } },
      },
      orderBy: { labName: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.outsourceLabMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: { select: { investigations: { where: { deletedAt: null } } } },
      },
    });
  }

  /** All tests routed to this reference lab. */
  findInvestigations(tenantId: string, outsourceLabId: string) {
    return this.prisma.investigation.findMany({
      where: { tenantId, outsourceLabId, deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        outsourceTatHours: true,
        labDepartment: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  update(tenantId: string, id: string, dto: UpdateOutsourceLabDto) {
    return this.prisma.outsourceLabMaster.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.outsourceLabMaster.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countInvestigations(outsourceLabId: string) {
    return this.prisma.investigation.count({
      where: { outsourceLabId, deletedAt: null },
    });
  }
}
