import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LabSignoffAuthoritiesRepository } from '../repositories/lab-signoff-authorities.repository';
import { CreateSignoffAuthorityDto } from '../dto/signoff-authority/create-signoff-authority.dto';
import { UpdateSignoffAuthorityDto } from '../dto/signoff-authority/update-signoff-authority.dto';
import { VerifyPermissionDto } from '../dto/signoff-authority/verify-permission.dto';

export interface PermissionCheckResult {
  isAuthorized: boolean;
  designationText?: string;
  medicalRegNo?: string;
  reason?: string;
}

@Injectable()
export class LabSignoffAuthoritiesService {
  constructor(private readonly repo: LabSignoffAuthoritiesRepository) {}

  async create(tenantId: string, dto: CreateSignoffAuthorityDto) {
    const user = await this.repo.findUser(tenantId, dto.hospitalUserId);
    if (!user) {
      throw new NotFoundException(
        'User not found (or inactive) in this hospital',
      );
    }

    if (dto.labDepartmentId) {
      const dept = await this.repo.findLabDepartment(
        tenantId,
        dto.labDepartmentId,
      );
      if (!dept) {
        throw new NotFoundException(
          'Lab department not found in this hospital',
        );
      }
    }

    // NULL-dept duplicates aren't caught by the DB unique index — check first
    const existing = await this.repo.findExact(
      tenantId,
      dto.hospitalUserId,
      dto.labDepartmentId ?? null,
    );
    if (existing) {
      throw new ConflictException(
        dto.labDepartmentId
          ? 'This user already has sign-off authority for this department'
          : 'This user already has GLOBAL sign-off authority',
      );
    }

    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(
    tenantId: string,
    filters: {
      labDepartmentId?: string;
      hospitalUserId?: string;
      isActive?: boolean;
    },
  ) {
    return this.repo.findAll(tenantId, filters);
  }

  async findOne(tenantId: string, id: string) {
    const authority = await this.repo.findById(tenantId, id);
    if (!authority) throw new NotFoundException('Sign-off authority not found');
    return authority;
  }

  async update(tenantId: string, id: string, dto: UpdateSignoffAuthorityDto) {
    await this.findOne(tenantId, id);

    if (dto.labDepartmentId) {
      const dept = await this.repo.findLabDepartment(
        tenantId,
        dto.labDepartmentId,
      );
      if (!dept) {
        throw new NotFoundException(
          'Lab department not found in this hospital',
        );
      }
    }

    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Sign-off authority deleted successfully' };
  }

  // ─── Permission Guard (consumed by the LIS reporting engine) ────────────────
  //
  // Resolution: dept-specific authority → global (null-dept) authority.
  // VERIFY requires canVerify; APPROVE_LOCK requires canApproveLock.

  async verifyPermission(
    tenantId: string,
    dto: VerifyPermissionDto,
  ): Promise<PermissionCheckResult> {
    const authority = await this.repo.findForPermission(
      tenantId,
      dto.hospitalUserId,
      dto.labDepartmentId,
    );

    if (!authority) {
      return {
        isAuthorized: false,
        reason: 'No sign-off authority configured for this user',
      };
    }

    const isAuthorized =
      dto.action === 'VERIFY' ? authority.canVerify : authority.canApproveLock;

    return {
      isAuthorized,
      designationText: authority.designationText,
      medicalRegNo: authority.medicalRegNo ?? undefined,
      ...(isAuthorized
        ? {}
        : {
            reason: `User lacks ${dto.action === 'VERIFY' ? 'verification' : 'approve/lock'} permission`,
          }),
    };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        'Sign-off authority already exists for this user and department',
      );
    }
    throw e;
  }
}
