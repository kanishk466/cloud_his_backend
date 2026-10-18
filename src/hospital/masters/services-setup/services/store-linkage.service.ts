import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { ServiceStoreType } from '@prisma/client';

/**
 * Phase 2.1B — Store Linkage (FOUNDATION ONLY).
 *
 * Linkage layer between services and the future Pharmacy/Inventory module:
 *   MEDICAL → item tracked in Medical Store (drugs, surgical consumables)
 *   GENERAL → item tracked in General Store (linen, diet, stationery)
 *   NONE    → no inventory tracking (consultations, lab tests, room charges)
 *
 * The store type is derived from the service's CATEGORY
 * (`ServiceCategoryMaster.storeType`) — one decision per category,
 * not per individual service.
 */
@Injectable()
export class StoreLinkageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Store type for a single service (from its category; NONE when uncategorized). */
  async getStoreTypeForService(
    tenantId: string,
    serviceId: string,
  ): Promise<{
    serviceId: string;
    serviceCode: string;
    storeType: ServiceStoreType;
  }> {
    const service = await this.prisma.serviceMaster.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: {
        id: true,
        serviceCode: true,
        categoryRel: { select: { storeType: true } },
      },
    });

    if (!service) throw new NotFoundException('Service not found');

    return {
      serviceId: service.id,
      serviceCode: service.serviceCode,
      storeType: service.categoryRel?.storeType ?? ServiceStoreType.NONE,
    };
  }

  /** All active services under categories of the given store type (for pharmacy stock mapping). */
  getServicesByStoreType(tenantId: string, storeType: ServiceStoreType) {
    return this.prisma.serviceMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        categoryRel: { is: { storeType, deletedAt: null } },
      },
      select: {
        id: true,
        serviceCode: true,
        serviceName: true,
        baseRate: true,
        uom: true,
        categoryRel: {
          select: { id: true, name: true, code: true, storeType: true },
        },
        subCategoryRel: { select: { id: true, name: true, code: true } },
      },
      orderBy: { serviceName: 'asc' },
    });
  }
}
