import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateSampleContainerDto } from '../dto/sample-container/create-sample-container.dto';
import { UpdateSampleContainerDto } from '../dto/sample-container/update-sample-container.dto';

@Injectable()
export class SampleContainersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateSampleContainerDto) {
    return this.prisma.sampleContainerMaster.create({
      data: { ...dto, tenantId },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.sampleContainerMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        _count: {
          select: { sampleTypes: true, investigations: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.sampleContainerMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  update(tenantId: string, id: string, dto: UpdateSampleContainerDto) {
    return this.prisma.sampleContainerMaster.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.sampleContainerMaster.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  countUsages(containerId: string) {
    return this.prisma.investigation.count({
      where: { sampleContainerId: containerId, deletedAt: null },
    });
  }
}
