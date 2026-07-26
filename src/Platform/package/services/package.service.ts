import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PackageRepository } from '../repositories/package.repository';
import { ModuleRepository } from '../../catalog/repositories/module.repository';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { AuditService } from '../../audit/audit.service';
import { AuditActor } from '../../audit/audit-actor';

@Injectable()
export class PackageService {
  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly moduleRepository: ModuleRepository,
    private readonly auditService: AuditService,
  ) {}

  async createPackage(dto: CreatePackageDto, actor?: AuditActor) {
    const existingPackage = await this.packageRepository.findByName(dto.name);
    if (existingPackage) {
      throw new ConflictException('Package name already exists');
    }

    const pkg = await this.packageRepository.create(dto);

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'PACKAGE_CREATED',
        targetType: 'Package',
        targetName: pkg.name,
        detail: `Package created at ${pkg.monthlyPrice}/month`,
      });
    }

    return pkg;
  }

  async getPackages() {
    return this.packageRepository.findAll();
  }

  async getPackageById(id: number) {
    const pkg = await this.packageRepository.findById(id);
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    return pkg;
  }

  async updatePackage(id: number, dto: UpdatePackageDto, actor?: AuditActor) {
    await this.getPackageById(id);

    if (dto.name) {
      const clash = await this.packageRepository.findByName(dto.name);
      if (clash && clash.id !== id) {
        throw new ConflictException('Package name already exists');
      }
    }

    const updated = await this.packageRepository.update(id, dto);

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'PACKAGE_UPDATED',
        targetType: 'Package',
        targetName: updated.name,
        detail: `Fields updated: ${Object.keys(dto).join(', ') || 'none'}`,
      });
    }

    return updated;
  }

  async removePackage(id: number, actor?: AuditActor) {
    const pkg = await this.getPackageById(id);

    // AssignedPackage -> Package uses onDelete: Restrict, so surface a clean
    // 409 instead of letting the FK violation bubble up as a 500.
    if (pkg._count.assignedPackages > 0) {
      throw new ConflictException(
        'Package is assigned to one or more hospitals and cannot be deleted',
      );
    }

    await this.packageRepository.remove(id);

    if (actor) {
      await this.auditService.log({
        ...actor,
        action: 'PACKAGE_DELETED',
        targetType: 'Package',
        targetName: pkg.name,
        detail: `Package #${id} deleted`,
      });
    }

    return { message: 'Package deleted successfully' };
  }

  async attachModule(packageId: number, moduleId: number) {
    const pkg = await this.packageRepository.findById(packageId);
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const module = await this.moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundException('Module not found');
    }

    if (!module.isActive) {
      throw new BadRequestException('Module is inactive');
    }

    const alreadyAttached = pkg.modules.some(
      (item) => item.moduleId === moduleId,
    );
    if (alreadyAttached) {
      throw new ConflictException('Module already attached');
    }

    return this.packageRepository.attachModule(packageId, moduleId);
  }
}
