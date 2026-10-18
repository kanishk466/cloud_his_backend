import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClinicalDepartmentsRepository } from '../repositories/clinical-departments.repository';
import { CreateClinicalDepartmentDto } from '../dto/clinical-department/create-clinical-department.dto';
import { UpdateClinicalDepartmentDto } from '../dto/clinical-department/update-clinical-department.dto';

@Injectable()
export class ClinicalDepartmentsService {
  constructor(private readonly repo: ClinicalDepartmentsRepository) {}

  async create(tenantId: string, dto: CreateClinicalDepartmentDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const department = await this.repo.findById(tenantId, id);
    if (!department)
      throw new NotFoundException('Clinical department not found');
    return department;
  }

  async update(tenantId: string, id: string, dto: UpdateClinicalDepartmentDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const [specializationCount, doctorCount] = await Promise.all([
      this.repo.countActiveSpecializations(tenantId, id),
      this.repo.countLinkedDoctors(tenantId, id),
    ]);

    if (specializationCount > 0 || doctorCount > 0) {
      throw new BadRequestException(
        `Cannot delete department: ${specializationCount} specialization(s) and ${doctorCount} doctor(s) are still linked to it. Reassign or delete them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Clinical department deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Clinical department code already exists');
    }
    throw e;
  }
}
