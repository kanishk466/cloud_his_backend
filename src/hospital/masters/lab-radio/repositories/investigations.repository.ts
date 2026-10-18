import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateInvestigationDto } from '../dto/investigation/create-investigation.dto';
import { UpdateInvestigationDto } from '../dto/investigation/update-investigation.dto';
import { FilterInvestigationDto } from '../dto/investigation/filter-investigation.dto';
import { ObservationMappingItemDto } from '../dto/observation/assign-observation.dto';

const DEPT_SELECT = {
  select: {
    id: true,
    name: true,
    code: true,
    departmentType: true,
    turnaroundHours: true,
  },
} as const;

const SERVICE_SELECT = {
  select: {
    id: true,
    serviceCode: true,
    serviceName: true,
    baseRate: true,
    isActive: true,
    categoryRel: { select: { id: true, code: true, name: true } },
    subCategoryRel: { select: { id: true, code: true, name: true } },
  },
} as const;

@Injectable()
export class InvestigationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateInvestigationDto) {
    return this.prisma.investigation.create({
      data: { ...dto, tenantId },
      include: { labDepartment: DEPT_SELECT, service: SERVICE_SELECT },
    });
  }

  findAll(tenantId: string, filters: FilterInvestigationDto) {
    return this.prisma.investigation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.labDepartmentId
          ? { labDepartmentId: filters.labDepartmentId }
          : {}),
        ...(filters.specimenType ? { specimenType: filters.specimenType } : {}),
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
                {
                  shortName: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        labDepartment: DEPT_SELECT,
        service: SERVICE_SELECT,
        _count: { select: { observations: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.investigation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { labDepartment: DEPT_SELECT, service: SERVICE_SELECT },
    });
  }

  /** Full detail: dept + service + ordered observations with their ranges. */
  findDetails(tenantId: string, id: string) {
    return this.prisma.investigation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        labDepartment: DEPT_SELECT,
        service: SERVICE_SELECT,
        observations: {
          orderBy: { sortOrder: 'asc' },
          include: {
            observation: {
              include: {
                referenceRanges: {
                  where: { isActive: true },
                  orderBy: [{ gender: 'asc' }, { minAgeYears: 'asc' }],
                },
              },
            },
          },
        },
      },
    });
  }

  update(tenantId: string, id: string, dto: UpdateInvestigationDto) {
    return this.prisma.investigation.update({
      where: { id, tenantId },
      data: dto,
      include: { labDepartment: DEPT_SELECT, service: SERVICE_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.investigation.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── Observation mapping (atomic replace) ───────────────────────────────────

  async replaceObservations(
    investigationId: string,
    items: ObservationMappingItemDto[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.investigationObservationMapping.deleteMany({
        where: { investigationId },
      });

      await tx.investigationObservationMapping.createMany({
        data: items.map((item, index) => ({
          investigationId,
          observationId: item.observationId,
          sortOrder: item.sortOrder ?? index,
          isMandatory: item.isMandatory ?? true,
          isReportable: item.isReportable ?? true,
        })),
      });

      return tx.investigationObservationMapping.findMany({
        where: { investigationId },
        orderBy: { sortOrder: 'asc' },
        include: { observation: true },
      });
    });
  }

  // ─── Tenant validation helpers ──────────────────────────────────────────────

  findService(tenantId: string, serviceId: string) {
    return this.prisma.serviceMaster.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      include: { categoryRel: { select: { code: true } } },
    });
  }

  findLabDepartment(tenantId: string, labDepartmentId: string) {
    return this.prisma.labDepartment.findFirst({
      where: { id: labDepartmentId, tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
  }

  findSampleType(tenantId: string, sampleTypeId: string) {
    return this.prisma.sampleType.findFirst({
      where: { id: sampleTypeId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }

  findSampleContainer(tenantId: string, containerId: string) {
    return this.prisma.sampleContainerMaster.findFirst({
      where: { id: containerId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
  }
}
