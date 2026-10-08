import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LabDepartmentsRepository } from '../repositories/lab-departments.repository';
import { CreateLabDepartmentDto } from '../dto/lab-department/create-lab-department.dto';
import { UpdateLabDepartmentDto } from '../dto/lab-department/update-lab-department.dto';

@Injectable()
export class LabDepartmentsService {
  constructor(private readonly repo: LabDepartmentsRepository) {}

  async create(tenantId: string, dto: CreateLabDepartmentDto) {
    await this.assertHeadUser(tenantId, dto.headUserId);
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
    const dept = await this.repo.findById(tenantId, id);
    if (!dept) throw new NotFoundException('Lab department not found');
    return dept;
  }

  async update(tenantId: string, id: string, dto: UpdateLabDepartmentDto) {
    await this.findOne(tenantId, id);
    if (dto.headUserId) {
      await this.assertHeadUser(tenantId, dto.headUserId);
    }
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const count = await this.repo.countActiveInvestigations(tenantId, id);
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete department: ${count} investigation(s) are still linked to it. Reassign or delete them first.`,
      );
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Lab department deleted successfully' };
  }

  private async assertHeadUser(tenantId: string, headUserId?: string) {
    if (!headUserId) return;
    const user = await this.repo.findHeadUser(tenantId, headUserId);
    if (!user) {
      throw new NotFoundException(
        'Head user not found (or inactive) in this hospital',
      );
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Lab department code already exists');
    }
    throw e;
  }
}
