import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServiceMasterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateServiceDto) {
    const exists = await this.prisma.serviceMaster.findFirst({
      where: { tenantId, serviceCode: dto.serviceCode, deletedAt: null },
    });
    if (exists) throw new ConflictException(`Service code '${dto.serviceCode}' already exists`);

    return this.prisma.serviceMaster.create({
      data: { tenantId, ...dto },
    });
  }

  async list(tenantId: string, search?: string, category?: string) {
    return this.prisma.serviceMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(category && { category: category as any }),
        ...(search && {
          OR: [
            { serviceName: { contains: search, mode: 'insensitive' } },
            { serviceCode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { serviceName: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.serviceMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(tenantId, id);
    return this.prisma.serviceMaster.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.serviceMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}