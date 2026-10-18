import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SpecializationsRepository } from '../repositories/specializations.repository';
import { ClinicalDepartmentsRepository } from '../repositories/clinical-departments.repository';
import { CreateSpecializationDto } from '../dto/specialization/create-specialization.dto';
import { UpdateSpecializationDto } from '../dto/specialization/update-specialization.dto';

@Injectable()
export class SpecializationsService {
  constructor(
    private readonly repo: SpecializationsRepository,
    private readonly departmentsRepo: ClinicalDepartmentsRepository,
  ) {}

  async create(tenantId: string, dto: CreateSpecializationDto) {
    await this.assertDepartmentExists(tenantId, dto.clinicalDepartmentId);
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  /** Dropdown source for a department (validates the department first). */
  async findByDepartment(
    tenantId: string,
    departmentId: string,
    isActive?: boolean,
  ) {
    await this.assertDepartmentExists(tenantId, departmentId);
    return this.repo.findByDepartment(tenantId, departmentId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const specialization = await this.repo.findById(tenantId, id);
    if (!specialization)
      throw new NotFoundException('Specialization not found');
    return specialization;
  }

  async update(tenantId: string, id: string, dto: UpdateSpecializationDto) {
    await this.findOne(tenantId, id);
    if (dto.clinicalDepartmentId) {
      await this.assertDepartmentExists(tenantId, dto.clinicalDepartmentId);
    }
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const doctorCount = await this.repo.countLinkedDoctors(tenantId, id);
    if (doctorCount > 0) {
      throw new BadRequestException(
        `Cannot delete specialization: ${doctorCount} doctor(s) are still linked to it. Reassign them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Specialization deleted successfully' };
  }

  private async assertDepartmentExists(tenantId: string, departmentId: string) {
    const department = await this.departmentsRepo.findById(
      tenantId,
      departmentId,
    );
    if (!department) {
      throw new NotFoundException(
        'Clinical department not found in this hospital',
      );
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Specialization code already exists');
    }
    throw e;
  }
}
