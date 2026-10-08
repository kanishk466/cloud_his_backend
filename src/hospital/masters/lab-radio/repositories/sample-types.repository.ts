import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateSampleTypeDto } from '../dto/sample-type/create-sample-type.dto';
import { UpdateSampleTypeDto } from '../dto/sample-type/update-sample-type.dto';

const CONTAINER_FIELDS = {
  id: true,
  name: true,
  code: true,
  capColor: true,
  hexColorCode: true,
  additive: true,
  defaultVolumeMl: true,
  tubeType: true,
} as const;

const CONTAINER_SELECT = { select: CONTAINER_FIELDS } as const;

@Injectable()
export class SampleTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateSampleTypeDto) {
    return this.prisma.sampleType.create({
      data: { ...dto, tenantId },
      include: { defaultContainer: CONTAINER_SELECT },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.sampleType.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        defaultContainer: CONTAINER_SELECT,
        _count: { select: { investigations: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.sampleType.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { defaultContainer: CONTAINER_SELECT },
    });
  }

  update(tenantId: string, id: string, dto: UpdateSampleTypeDto) {
    return this.prisma.sampleType.update({
      where: { id, tenantId },
      data: dto,
      include: { defaultContainer: CONTAINER_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.sampleType.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countUsages(sampleTypeId: string) {
    return this.prisma.investigation.count({
      where: { sampleTypeId, deletedAt: null },
    });
  }

  findContainer(tenantId: string, containerId: string) {
    return this.prisma.sampleContainerMaster.findFirst({
      where: { id: containerId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }

  // ─── Worklist source: investigations with container/sample linkage ──────────

  findForWorklist(tenantId: string, investigationIds: string[]) {
    return this.prisma.investigation.findMany({
      where: { id: { in: investigationIds }, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        fastingRequired: true,
        sampleContainerRel: { select: CONTAINER_FIELDS },
        sampleTypeRel: {
          select: {
            id: true,
            name: true,
            code: true,
            collectionInstructions: true,
            defaultContainer: { select: CONTAINER_FIELDS },
          },
        },
      },
    });
  }
}
