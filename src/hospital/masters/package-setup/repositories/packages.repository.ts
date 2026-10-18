import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PackageType } from '@prisma/client';
import { CreatePackageDto } from '../dto/package/create-package.dto';
import { UpdatePackageDto } from '../dto/package/update-package.dto';
import { FilterPackageDto } from '../dto/package/filter-package.dto';

export const PACKAGE_INCLUDE = {
  roomType: { select: { id: true, name: true, code: true } },
  serviceSku: {
    select: {
      id: true,
      serviceCode: true,
      serviceName: true,
      baseRate: true,
      itemType: true,
      isActive: true,
    },
  },
  components: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      service: {
        select: {
          id: true,
          serviceCode: true,
          serviceName: true,
          baseRate: true,
          itemType: true,
        },
      },
    },
  },
  doctorConsults: {
    include: {
      clinicalDepartment: { select: { id: true, name: true, code: true } },
      doctorProfile: {
        select: {
          id: true,
          hospitalUser: { select: { firstName: true, lastName: true } },
        },
      },
    },
  },
  exclusions: { orderBy: { sortOrder: 'asc' as const } },
} as const;

@Injectable()
export class PackagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Auto-SKU: create (or reuse orphan) ServiceMaster PACKAGE record ────────

  async findServiceByCode(tenantId: string, serviceCode: string) {
    return this.prisma.serviceMaster.findFirst({
      where: { tenantId, serviceCode, deletedAt: null },
      include: { packageMaster: { select: { id: true } } },
    });
  }

  /** Single-transaction create: SKU + package + nested structure. */
  async createFull(
    tenantId: string,
    dto: CreatePackageDto,
    categoryId: string | null,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Auto-SKU (reuse an orphan PACKAGE service with the same code)
        const existingSku = await tx.serviceMaster.findFirst({
          where: { tenantId, serviceCode: dto.code, deletedAt: null },
          include: { packageMaster: { select: { id: true } } },
        });

        let serviceId: string;
        if (existingSku) {
          if (existingSku.packageMaster) {
            throw new Error('PACKAGE_CODE_EXISTS');
          }
          serviceId = existingSku.id;
        } else {
          const sku = await tx.serviceMaster.create({
            data: {
              tenantId,
              serviceCode: dto.code,
              serviceName: dto.name,
              baseRate: dto.basePrice,
              itemType: 'PACKAGE',
              categoryId,
              rateEditable: true, // package price varies per negotiation
            },
          });
          serviceId = sku.id;
        }

        // 2. Package master linked to the SKU
        const pkg = await tx.packageMaster.create({
          data: {
            tenantId,
            serviceId,
            name: dto.name,
            code: dto.code,
            packageType: dto.packageType ?? 'OPD_HEALTH_CHECK',
            roomTypeId: dto.roomTypeId ?? null,
            includedStayDays: dto.includedStayDays ?? 0,
            basePrice: dto.basePrice,
            validityDays: dto.validityDays ?? 30,
            description: dto.description,
          },
        });

        // 3. Nested structure
        if (dto.components?.length) {
          await tx.packageComponent.createMany({
            data: dto.components.map((c, i) => ({
              tenantId,
              packageId: pkg.id,
              serviceId: c.serviceId,
              quantity: c.quantity ?? 1,
              isOptional: c.isOptional ?? false,
              sortOrder: c.sortOrder ?? i,
            })),
          });
        }

        if (dto.consults?.length) {
          await tx.packageDoctorConsult.createMany({
            data: dto.consults.map((c) => ({
              tenantId,
              packageId: pkg.id,
              clinicalDepartmentId: c.clinicalDepartmentId ?? null,
              doctorProfileId: c.doctorProfileId ?? null,
              consultType: c.consultType ?? 'OPD_VISIT',
              maxVisits: c.maxVisits,
            })),
          });
        }

        if (dto.exclusions?.length) {
          await tx.packageExclusion.createMany({
            data: dto.exclusions.map((e, i) => ({
              tenantId,
              packageId: pkg.id,
              exclusionText: e.exclusionText,
              sortOrder: e.sortOrder ?? i,
            })),
          });
        }

        return tx.packageMaster.findUnique({
          where: { id: pkg.id },
          include: PACKAGE_INCLUDE,
        });
      },
      { timeout: 30000 },
    );
  }

  findAll(tenantId: string, filters: FilterPackageDto) {
    return this.prisma.packageMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.packageType ? { packageType: filters.packageType } : {}),
        ...(filters.roomTypeId ? { roomTypeId: filters.roomTypeId } : {}),
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
              ],
            }
          : {}),
      },
      include: {
        roomType: PACKAGE_INCLUDE.roomType,
        serviceSku: PACKAGE_INCLUDE.serviceSku,
        _count: { select: { components: true, doctorConsults: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.packageMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: PACKAGE_INCLUDE,
    });
  }

  /** Update package + sync the SKU's rate/name in one transaction. */
  async updateWithSkuSync(
    tenantId: string,
    id: string,
    dto: UpdatePackageDto,
    serviceId: string | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packageMaster.update({
        where: { id, tenantId },
        data: dto,
      });

      if (
        serviceId &&
        (dto.basePrice !== undefined || dto.name !== undefined)
      ) {
        await tx.serviceMaster.update({
          where: { id: serviceId },
          data: {
            ...(dto.basePrice !== undefined ? { baseRate: dto.basePrice } : {}),
            ...(dto.name !== undefined ? { serviceName: dto.name } : {}),
          },
        });
      }

      return tx.packageMaster.findUnique({
        where: { id },
        include: PACKAGE_INCLUDE,
      });
    });
  }

  /** Soft-delete package + deactivate its SKU. */
  async softDelete(tenantId: string, id: string, serviceId: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packageMaster.update({
        where: { id, tenantId },
        data: { deletedAt: new Date(), isActive: false },
      });

      if (serviceId) {
        await tx.serviceMaster.update({
          where: { id: serviceId },
          data: { isActive: false },
        });
      }

      return updated;
    });
  }

  // ─── Structure sync (atomic replace) ─────────────────────────────────────────

  async replaceComponents(
    tenantId: string,
    packageId: string,
    components: CreatePackageDto['components'],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.packageComponent.deleteMany({ where: { tenantId, packageId } });
      if (components?.length) {
        await tx.packageComponent.createMany({
          data: components.map((c, i) => ({
            tenantId,
            packageId,
            serviceId: c.serviceId,
            quantity: c.quantity ?? 1,
            isOptional: c.isOptional ?? false,
            sortOrder: c.sortOrder ?? i,
          })),
        });
      }
      return tx.packageComponent.findMany({
        where: { tenantId, packageId },
        orderBy: { sortOrder: 'asc' },
        include: { service: PACKAGE_INCLUDE.components.include.service },
      });
    });
  }

  async replaceConsults(
    tenantId: string,
    packageId: string,
    consults: CreatePackageDto['consults'],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.packageDoctorConsult.deleteMany({
        where: { tenantId, packageId },
      });
      if (consults?.length) {
        await tx.packageDoctorConsult.createMany({
          data: consults.map((c) => ({
            tenantId,
            packageId,
            clinicalDepartmentId: c.clinicalDepartmentId ?? null,
            doctorProfileId: c.doctorProfileId ?? null,
            consultType: c.consultType ?? 'OPD_VISIT',
            maxVisits: c.maxVisits,
          })),
        });
      }
      return tx.packageDoctorConsult.findMany({
        where: { tenantId, packageId },
        include: {
          clinicalDepartment:
            PACKAGE_INCLUDE.doctorConsults.include.clinicalDepartment,
          doctorProfile: PACKAGE_INCLUDE.doctorConsults.include.doctorProfile,
        },
      });
    });
  }

  async replaceExclusions(
    tenantId: string,
    packageId: string,
    exclusions: CreatePackageDto['exclusions'],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.packageExclusion.deleteMany({ where: { tenantId, packageId } });
      if (exclusions?.length) {
        await tx.packageExclusion.createMany({
          data: exclusions.map((e, i) => ({
            tenantId,
            packageId,
            exclusionText: e.exclusionText,
            sortOrder: e.sortOrder ?? i,
          })),
        });
      }
      return tx.packageExclusion.findMany({
        where: { tenantId, packageId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  // ─── Validation helpers ──────────────────────────────────────────────────────

  findRoomType(tenantId: string, roomTypeId: string) {
    return this.prisma.roomType.findFirst({
      where: { id: roomTypeId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  findServicesByIds(tenantId: string, ids: string[]) {
    return this.prisma.serviceMaster.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null, isActive: true },
      select: { id: true, itemType: true, serviceName: true },
    });
  }

  findDepartment(tenantId: string, id: string) {
    return this.prisma.clinicalDepartment.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  findDoctor(tenantId: string, id: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { id, tenantId, isActive: true },
      select: { id: true },
    });
  }

  findProceduresCategory(tenantId: string) {
    return this.prisma.serviceCategoryMaster.findFirst({
      where: { tenantId, code: 'PROC', deletedAt: null },
      select: { id: true },
    });
  }
}
