import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReferDoctorsRepository } from '../repositories/refer-doctors.repository';
import { CreateReferDoctorDto } from '../dto/refer-doctor/create-refer-doctor.dto';
import { UpdateReferDoctorDto } from '../dto/refer-doctor/update-refer-doctor.dto';
import { FilterReferDoctorDto } from '../dto/refer-doctor/filter-refer-doctor.dto';

@Injectable()
export class ReferDoctorsService {
  constructor(private readonly repo: ReferDoctorsRepository) {}

  async create(tenantId: string, dto: CreateReferDoctorDto) {
    if (dto.proUserId) {
      await this.assertProUserExists(tenantId, dto.proUserId);
    }

    const code = dto.code ?? (await this.repo.generateCode(tenantId));

    try {
      return await this.repo.create(tenantId, { ...dto, code });
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, filters: FilterReferDoctorDto) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const doctor = await this.repo.findById(tenantId, id);
    if (!doctor) throw new NotFoundException('Refer doctor not found');
    return doctor;
  }

  async update(tenantId: string, id: string, dto: UpdateReferDoctorDto) {
    await this.findOne(tenantId, id);
    if (dto.proUserId) {
      await this.assertProUserExists(tenantId, dto.proUserId);
    }
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  /** Reassign marketing ownership (PRO) of this refer doctor. */
  async assignPro(tenantId: string, id: string, proUserId: string) {
    await this.findOne(tenantId, id);
    await this.assertProUserExists(tenantId, proUserId);
    return this.repo.assignPro(tenantId, id, proUserId);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Refer doctor deleted successfully' };
  }

  private async assertProUserExists(tenantId: string, proUserId: string) {
    const proUser = await this.repo.findProUser(tenantId, proUserId);
    if (!proUser) {
      throw new NotFoundException(
        'PRO user not found (or inactive) in this hospital',
      );
    }
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        'A refer doctor with this mobile number already exists',
      );
    }
    throw e;
  }
}
