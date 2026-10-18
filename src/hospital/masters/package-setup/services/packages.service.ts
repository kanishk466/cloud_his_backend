import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PackagesRepository } from '../repositories/packages.repository';
import { CreatePackageDto } from '../dto/package/create-package.dto';
import { UpdatePackageDto } from '../dto/package/update-package.dto';
import { FilterPackageDto } from '../dto/package/filter-package.dto';
import { SyncPackageComponentsDto } from '../dto/component/sync-package-components.dto';
import { SyncPackageConsultsDto } from '../dto/consult/sync-package-consults.dto';
import { SyncPackageExclusionsDto } from '../dto/exclusion/sync-package-exclusions.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly repo: PackagesRepository) {}

  // ─── Create (auto-SKU in one transaction) ────────────────────────────────────

  async create(tenantId: string, dto: CreatePackageDto) {
    // Code pre-check (friendly 409 before the tx)
    const existing = await this.repo.findServiceByCode(tenantId, dto.code);
    if (existing?.packageMaster) {
      throw new ConflictException(`Package code '${dto.code}' already exists`);
    }

    if (dto.roomTypeId) {
      const roomType = await this.repo.findRoomType(tenantId, dto.roomTypeId);
      if (!roomType) {
        throw new NotFoundException('Room type not found in this hospital');
      }
    }

    if (dto.components?.length) {
      await this.validateComponentServices(
        tenantId,
        dto.components.map((c) => c.serviceId),
      );
    }
    if (dto.consults?.length) {
      await this.validateConsultRefs(tenantId, dto.consults);
    }

    const category = await this.repo.findProceduresCategory(tenantId);

    try {
      return await this.repo.createFull(tenantId, dto, category?.id ?? null);
    } catch (e) {
      if (e instanceof Error && e.message === 'PACKAGE_CODE_EXISTS') {
        throw new ConflictException(
          `Package code '${dto.code}' already exists`,
        );
      }
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Package code '${dto.code}' already exists`,
        );
      }
      throw e;
    }
  }

  findAll(tenantId: string, filters: FilterPackageDto) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const pkg = await this.repo.findById(tenantId, id);
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  /** Full breakdown — same as findOne, named for the API contract. */
  getDetails(tenantId: string, id: string) {
    return this.findOne(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdatePackageDto) {
    const pkg = await this.findOne(tenantId, id);

    if (dto.roomTypeId) {
      const roomType = await this.repo.findRoomType(tenantId, dto.roomTypeId);
      if (!roomType) {
        throw new NotFoundException('Room type not found in this hospital');
      }
    }

    // basePrice/name changes sync the SKU automatically (inside repo tx)
    return this.repo.updateWithSkuSync(tenantId, id, dto, pkg.serviceId);
  }

  async remove(tenantId: string, id: string) {
    const pkg = await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id, pkg.serviceId);
    return { message: 'Package deleted successfully (SKU deactivated)' };
  }

  // ─── Structure sync endpoints ────────────────────────────────────────────────

  async syncComponents(
    tenantId: string,
    id: string,
    dto: SyncPackageComponentsDto,
  ) {
    await this.findOne(tenantId, id);
    await this.validateComponentServices(
      tenantId,
      dto.components.map((c) => c.serviceId),
    );

    try {
      const components = await this.repo.replaceComponents(
        tenantId,
        id,
        dto.components,
      );
      return { message: 'Package components updated successfully', components };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Duplicate service in the components list');
      }
      throw e;
    }
  }

  async syncConsults(
    tenantId: string,
    id: string,
    dto: SyncPackageConsultsDto,
  ) {
    await this.findOne(tenantId, id);
    await this.validateConsultRefs(tenantId, dto.consults);

    const doctorConsults = await this.repo.replaceConsults(
      tenantId,
      id,
      dto.consults,
    );
    return {
      message: 'Package doctor consults updated successfully',
      doctorConsults,
    };
  }

  async syncExclusions(
    tenantId: string,
    id: string,
    dto: SyncPackageExclusionsDto,
  ) {
    await this.findOne(tenantId, id);

    const exclusions = await this.repo.replaceExclusions(
      tenantId,
      id,
      dto.exclusions,
    );
    return { message: 'Package exclusions updated successfully', exclusions };
  }

  // ─── Validation helpers ──────────────────────────────────────────────────────

  private async validateComponentServices(
    tenantId: string,
    serviceIds: string[],
  ) {
    const services = await this.repo.findServicesByIds(tenantId, serviceIds);
    const byId = new Map(services.map((s) => [s.id, s]));

    const invalid = serviceIds.filter((id) => !byId.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown or inactive services: ${invalid.join(', ')}`,
      );
    }

    const nested = services.filter((s) => s.itemType === 'PACKAGE');
    if (nested.length > 0) {
      throw new BadRequestException(
        `Packages cannot contain other packages: ${nested.map((s) => s.serviceName).join(', ')}`,
      );
    }
  }

  private async validateConsultRefs(
    tenantId: string,
    consults: Array<{
      clinicalDepartmentId?: string;
      doctorProfileId?: string;
    }>,
  ) {
    for (const consult of consults) {
      if (consult.clinicalDepartmentId) {
        const dept = await this.repo.findDepartment(
          tenantId,
          consult.clinicalDepartmentId,
        );
        if (!dept) {
          throw new NotFoundException(
            `Clinical department not found: ${consult.clinicalDepartmentId}`,
          );
        }
      }
      if (consult.doctorProfileId) {
        const doctor = await this.repo.findDoctor(
          tenantId,
          consult.doctorProfileId,
        );
        if (!doctor) {
          throw new NotFoundException(
            `Doctor profile not found (or inactive): ${consult.doctorProfileId}`,
          );
        }
      }
    }
  }
}
