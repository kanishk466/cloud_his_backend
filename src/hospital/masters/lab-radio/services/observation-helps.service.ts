import { Injectable, NotFoundException } from '@nestjs/common';
import { ObservationHelpsRepository } from '../repositories/observation-helps.repository';
import { CreateObservationHelpDto } from '../dto/observation-help/create-observation-help.dto';
import { UpdateObservationHelpDto } from '../dto/observation-help/update-observation-help.dto';

@Injectable()
export class ObservationHelpsService {
  constructor(private readonly repo: ObservationHelpsRepository) {}

  async create(tenantId: string, dto: CreateObservationHelpDto) {
    const observation = await this.repo.findObservation(
      tenantId,
      dto.observationId,
    );
    if (!observation)
      throw new NotFoundException('Observation not found in this hospital');
    return this.repo.create(tenantId, dto);
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findForObservation(tenantId: string, observationId: string) {
    const observation = await this.repo.findObservation(
      tenantId,
      observationId,
    );
    if (!observation)
      throw new NotFoundException('Observation not found in this hospital');
    return this.repo.findForObservation(tenantId, observationId);
  }

  /** Aggregated help for every observation inside an investigation (entry screen). */
  async findForInvestigation(tenantId: string, investigationId: string) {
    const investigation = await this.repo.findInvestigation(
      tenantId,
      investigationId,
    );
    if (!investigation) {
      throw new NotFoundException('Investigation not found in this hospital');
    }
    return this.repo.findForInvestigation(tenantId, investigationId);
  }

  async findOne(tenantId: string, id: string) {
    const help = await this.repo.findById(tenantId, id);
    if (!help) throw new NotFoundException('Observation help not found');
    return help;
  }

  async update(tenantId: string, id: string, dto: UpdateObservationHelpDto) {
    await this.findOne(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.remove(tenantId, id);
    return { message: 'Observation help deleted successfully' };
  }
}
