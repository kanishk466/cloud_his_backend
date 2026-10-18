import { Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionRepository } from './admission.repository';
import { FilterAdmissionDto } from './dto/filter-admission.dto';

@Injectable()
export class AdmissionService {
  constructor(private readonly repo: AdmissionRepository) {}

  async findAll(tenantId: string, filters: FilterAdmissionDto) {
    const { data, total, page, limit } = await this.repo.findAll(
      tenantId,
      filters,
    );
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  findActive(tenantId: string) {
    return this.repo.findActive(tenantId);
  }

  async findOne(tenantId: string, id: string) {
    const admission = await this.repo.findById(tenantId, id);
    if (!admission) throw new NotFoundException('Admission not found');
    return admission;
  }
}
