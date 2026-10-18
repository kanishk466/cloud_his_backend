import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateAmenityDto } from '../dto/amenity/create-amenity.dto';

@Injectable()
export class AmenitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateAmenityDto) {
    return this.prisma.bedAmenity.create({ data: { ...dto, tenantId } });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.bedAmenity.findMany({
      where: {
        tenantId,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.bedAmenity.findFirst({ where: { id, tenantId } });
  }

  findByIds(tenantId: string, ids: string[]) {
    return this.prisma.bedAmenity.findMany({
      where: { id: { in: ids }, tenantId, isActive: true },
      select: { id: true },
    });
  }

  update(tenantId: string, id: string, dto: Partial<CreateAmenityDto>) {
    return this.prisma.bedAmenity.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  countRoomMappings(amenityId: string) {
    return this.prisma.roomBedAmenity.count({ where: { amenityId } });
  }

  /** Hard delete — only called when no room mapping exists. */
  remove(tenantId: string, id: string) {
    return this.prisma.bedAmenity.delete({ where: { id, tenantId } });
  }
}
